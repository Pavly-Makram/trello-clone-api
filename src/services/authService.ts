import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/prisma";
import redis from "../config/redis";
import { ENV } from "../config/env";
import { RegisterInput, LoginInput, ResetPasswordInput } from "../schemas/auth.schema";
import { HttpError } from "../utils/HttpError";

interface StoredRefreshToken {
    userId: number;
    email: string;
    familyId: string;
    status: "ACTIVE" | "USED";
    rotatedAt?: number;
}

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 Days
const RACE_GRACE_PERIOD_MS = 5000;



const generateAccessToken = (userId: number, email: string): string => {
    const secret = ENV;
    return jwt.sign({ id: userId, email }, secret.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: ACCESS_TOKEN_TTL,
        jwtid: crypto.randomUUID(),
        issuer: secret.JWT_ISSUER,
        audience: secret.JWT_AUDIENCE,
    });
};

const hashToken = (token: string): string => {
    return crypto.createHash("sha256").update(token).digest("hex");
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


const createSession = async (userId: number, email: string) => {
    const accessToken = generateAccessToken(userId, email);
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const tokenHash = hashToken(refreshToken);
    const familyId = crypto.randomUUID();

    const payload: StoredRefreshToken = {
        userId,
        email,
        familyId,
        status: "ACTIVE",
    };

    await redis.setex(
        `rt:${tokenHash}`,
        REFRESH_TOKEN_TTL_SECONDS,
        JSON.stringify(payload)
    );

    await redis.sadd(`rt_family:${familyId}`, tokenHash);
    await redis.expire(`rt_family:${familyId}`, REFRESH_TOKEN_TTL_SECONDS);

    return { accessToken, refreshToken };
};

const revokeTokenFamily = async (familyId: string) => {
    const familyKey = `rt_family:${familyId}`;
    
    const tokenHashes = await redis.smembers(familyKey);

    if (tokenHashes.length > 0) {
        const keysToDelete = tokenHashes.map((hash) => `rt:${hash}`);
        await redis.del(...keysToDelete);
    }

    await redis.del(familyKey);
};


export const refreshSession = async (
    rawRefreshToken: string,
    retryCount = 0
): Promise<{ accessToken: string; refreshToken?: string }> => {
    const tokenHash = hashToken(rawRefreshToken);
    const lockKey = `lock:rt:${tokenHash}`;

    const acquiredLock = await redis.set(lockKey, "1", "EX", 5, "NX");

    if (!acquiredLock) {
        if (retryCount < 3) {
            await sleep(150);
            return refreshSession(rawRefreshToken, retryCount + 1);
        }
        throw new HttpError(409, "Concurrent refresh in progress. Please retry.");
    }

    try {
        const rawData = await redis.get(`rt:${tokenHash}`);
        if (!rawData) {
            throw new HttpError(401, "Invalid or expired refresh token");
        }

        const data: StoredRefreshToken = JSON.parse(rawData);

        if (data.status === "USED") {
            const isWithinGracePeriod =
                data.rotatedAt && Date.now() - data.rotatedAt < RACE_GRACE_PERIOD_MS;

            if (isWithinGracePeriod) {
                const accessToken = generateAccessToken(data.userId, data.email);
                return { accessToken };
            }

            await revokeTokenFamily(data.familyId);
            throw new HttpError(401, "Refresh token reuse detected. Session revoked.");
        }

        const remainingTtl = await redis.ttl(`rt:${tokenHash}`);
        if (remainingTtl > 0) {
            await redis.setex(
                `rt:${tokenHash}`,
                remainingTtl,
                JSON.stringify({ ...data, status: "USED", rotatedAt: Date.now() })
            );
        }

        const newAccessToken = generateAccessToken(data.userId, data.email);
        const newRefreshToken = crypto.randomBytes(64).toString("hex");
        const newTokenHash = hashToken(newRefreshToken);

        const newPayload: StoredRefreshToken = {
            userId: data.userId,
            email: data.email,
            familyId: data.familyId,
            status: "ACTIVE",
        };

        await redis.setex(`rt:${newTokenHash}`, REFRESH_TOKEN_TTL_SECONDS, JSON.stringify(newPayload));
        await redis.sadd(`rt_family:${data.familyId}`, newTokenHash);
        await redis.expire(`rt_family:${data.familyId}`, REFRESH_TOKEN_TTL_SECONDS);

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } finally {
        await redis.del(lockKey);
    }
};


/**
 * @description Register new user
 */
export const register = async (data: RegisterInput) => {
    const { email, username, password, avatar } = data;

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new HttpError(409, "Email is already registered");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
        data: {
            email,
            username,
            password: hashedPassword,
            avatar,
        },
    });

    const { accessToken, refreshToken } = await createSession(user.id, user.email);
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, accessToken, refreshToken };
};

/**
 * @description Authenticate user login
 */
export const login = async (data: LoginInput) => {
    const { email, password } = data;

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new HttpError(401, "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new HttpError(401, "Invalid email or password");
    }

    const { accessToken, refreshToken } = await createSession(user.id, user.email);

    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, accessToken, refreshToken };
};


/**
 * @description Generate password reset token
 */


export const forgotPassword = async (email: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        return { devResetToken: null };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await redis.setex(`pwd-reset:${resetToken}`, 900, user.id.toString());

    return { devResetToken: resetToken };
};

/**
 * @description Reset user password with token
 */
export const resetPassword = async (data: ResetPasswordInput) => {
    const { token, newPassword } = data;

    const userId = await redis.get(`pwd-reset:${token}`);
    if (!userId) {
        throw new HttpError(400, "Invalid or expired password reset token");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
        where: { id: Number(userId) },
        data: { password: hashedPassword },
    });

    await redis.del(`pwd-reset:${token}`);
};