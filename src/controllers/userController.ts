import { Request, Response } from "express";
import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";
import redis from "../config/redis";

const CACHE_TTL = 3600; // (one hour)
const getprofileCacheKey = (userId: number) => `user:profile:${userId}`;


/**
 * @description Get User Profile
 * @route api/users/profile
 * @method get
 * @access public
 */


export const getUserProfile = async (req: Request<any, {}>,
    res: Response) => {
    const userId = req.user!.id
    try {
        const cacheKey = getprofileCacheKey(userId);
        const cachedProfile = await redis.get(cacheKey);
        if (cachedProfile) {
            return res.status(200).json({
                message: "Profile Shown successfully (from cache)",
                user: JSON.parse(cachedProfile)
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                createdAt: true,
            }
        })
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(user));
        return res.status(200).json({
            message: "User Profile retrieved successfully",
            user
        });
    }
    catch (error) {
        console.error("Redis Cache Error:", error);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                createdAt: true,
            }
        });
        return res.status(200).json({
            message: "User Profile retrieved successfully",
            user
        });
    }
}

/**
 * @description Update User Profile
 * @route api/users/profile
 * @method patch
 * @access public
 */


export const updateUserProfile = async (req: Request<any, {}>,
    res: Response) => {
    const userId = req.user!.id
    const { username, avatar } = req.body;
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
    })
    await redis.del(getprofileCacheKey(userId));

    return res.status(200).json({
        message: "User Profile updated successfully",
        user
    });
}


/**
 * @description Delete User Profile
 * @route api/users/profile
 * @method delete
 * @access public
 */


export const deleteUserProfile = async (req: Request<any, {}>,
    res: Response) => {
    const userId = req.user!.id
    const user = await prisma.user.delete({
        where: { id: userId },
    })
    await redis.del(getprofileCacheKey(userId));
    return res.status(200).json({
        message: "User Profile deleted successfully",
    });
}








/**
 * @description Search Users
 * @route GET /api/users/search?query
 * @method get
 * @access private
 */

export const searchUsers = async (req: Request<any, any, any, any>, res: Response) => {

    const query = (req.query.query as string) || "";
    const currentUserId = req.user!.id;
    const whereCondition: Prisma.UserWhereInput = {
        AND: [
            { id: { not: currentUserId } },
            {
                OR: [
                    { username: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                ],
            },
        ],
    };
    const { page, limit } = req.query;
    const skip = (page - 1) * limit;
    if (!query.trim()) {
        return res.status(200).json({
            message: "Users retrieved successfully",
            data: [],
            pagination: {
                totalItems: 0,
                totalPages: 0,
                currentPage: Number(page) || 1,
                limit: Number(limit) || 10,
                hasNextPage: false,
                hasPrevPage: false,
            },
        });
    }

    const [users, totalUsers] = await prisma.$transaction([
        prisma.user.findMany({
            where: whereCondition,
            select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
            },
            skip: skip,
            take: limit,
        }),
        prisma.user.count({
            where: whereCondition,
        })
    ])
    const totalPages = Math.ceil(totalUsers / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
        message: "Users retrieved successfully",
        data: users,
        pagination: {
            totalItems: totalUsers,
            totalPages,
            currentPage: page,
            limit,
            hasNextPage,
            hasPrevPage,
        },
    });

};