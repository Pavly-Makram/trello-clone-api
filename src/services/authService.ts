import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/prisma";
import redis from "../config/redis";
import { RegisterInput, LoginInput, ResetPasswordInput } from "../schemas/auth.schema";
import { HttpError } from "../utils/HttpError";

const generateToken = (userId: number, email: string): string => {
    const secret = process.env.JWT_SECRET || "default_super_secret_key";
    return jwt.sign({ id: userId, email }, secret, {
        expiresIn: "7d",
    });
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

    const token = generateToken(user.id, user.email);
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
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

    const token = generateToken(user.id, user.email);
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
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