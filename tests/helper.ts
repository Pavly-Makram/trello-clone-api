import prisma from "../src/config/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ENV } from "../src/config/env";

export const cleanDatabase = async () => {
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.cardAssignee.deleteMany();
    await prisma.card.deleteMany();
    await prisma.list.deleteMany();
    await prisma.boardMember.deleteMany();
    await prisma.board.deleteMany();
    await prisma.user.deleteMany();
};

export const createTestUser = async (customEmail?: string, customUsername?: string) => {
    const email = customEmail || `user_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
    const username = customUsername || `user_${Date.now().toString().slice(-4)}`;
    const hashedPassword = await bcrypt.hash("password123", 10);

    const user = await prisma.user.create({
        data: {
            email,
            username,
            password: hashedPassword,
        },
    });

    const token = jwt.sign(
        { id: user.id, email: user.email },
        ENV.JWT_SECRET,
        {
            algorithm: "HS256",
            expiresIn: "1d",
            jwtid: crypto.randomUUID(),
            issuer: ENV.JWT_ISSUER,
            audience: ENV.JWT_AUDIENCE,
        }
    );

    return { user, token };
};