import prisma from "../config/prisma";
import * as cacheService from "./cacheService";
import { Prisma } from "@prisma/client";
import { UpdateUserProfileInput } from "../schemas";

const CACHE_TTL = 3600;
const getProfileCacheKey = (userId: number) => `user:profile:${userId}`;

export const getUserProfile = async (userId: number) => {
    const cacheKey = getProfileCacheKey(userId);

    const cachedProfile = await cacheService.getCache(cacheKey);
    if (cachedProfile) {
        return cachedProfile;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            createdAt: true,
        },
    });

    if (user) {
        await cacheService.setCache(cacheKey, user, CACHE_TTL);
    }

    return user;
};

export const updateUserProfile = async (userId: number, data: UpdateUserProfileInput) => {
    const { username, avatar } = data;

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            ...(username && { username }),
            ...(avatar !== undefined && { avatar }),
        },
        select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            updatedAt: true,
        },
    });

    await cacheService.deleteCache(getProfileCacheKey(userId));

    return user;
};

export const deleteUserProfile = async (userId: number) => {
    const user = await prisma.user.delete({
        where: { id: userId },
    });

    await cacheService.deleteCache(getProfileCacheKey(userId));

    return user;
};

export const searchUsers = async (
    currentUserId: number,
    queryText: string,
    page: number = 1,
    limit: number = 10
) => {
    if (!queryText.trim()) {
        return {
            users: [],
            pagination: {
                totalItems: 0,
                totalPages: 0,
                currentPage: Number(page) || 1,
                limit: Number(limit) || 10,
                hasNextPage: false,
                hasPrevPage: false,
            },
        };
    }

    const whereCondition: Prisma.UserWhereInput = {
        AND: [
            { id: { not: currentUserId } },
            {
                OR: [
                    { username: { contains: queryText, mode: "insensitive" } },
                    { email: { contains: queryText, mode: "insensitive" } },
                ],
            },
        ],
    };

    const skip = (Number(page) - 1) * Number(limit);

    const [users, totalUsers] = await prisma.$transaction([
        prisma.user.findMany({
            where: whereCondition,
            select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
            },
            skip,
            take: Number(limit),
        }),
        prisma.user.count({ where: whereCondition }),
    ]);

    const totalPages = Math.ceil(totalUsers / Number(limit));

    return {
        users,
        pagination: {
            totalItems: totalUsers,
            totalPages,
            currentPage: Number(page),
            limit: Number(limit),
            hasNextPage: Number(page) < totalPages,
            hasPrevPage: Number(page) > 1,
        },
    };
};