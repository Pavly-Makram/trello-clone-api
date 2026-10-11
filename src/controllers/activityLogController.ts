import { Request, Response } from "express";
import { CreateActivityInput } from "../schemas/activityLog.schema"
import prisma from "../config/prisma";
import { getIO } from "../sockets/socket";


/**
 * @description Create New Activity
 * @route /api/activities
 * @method post
 * @access private (Owner , Admin , Member)
 */

export const createNewActivity = async (
    req: Request<any, {}, CreateActivityInput, any>,
    res: Response
) => {
    const { action, boardId, cardId } = req.body;

    const userId = req.user!.id;
    if (cardId) {
        const card = await prisma.card.findUnique({
            where: { id: cardId },
            include: {
                list: {
                    include: {
                        board: true
                    }
                }
            }
        });
        if (!card) {
            return res.status(404).json({ message: "Card not found" });
        }
        if (!card.list) {
            return res.status(404).json({ message: "List not found" });
        }

        if (!card.list.board) {
            return res.status(404).json({ message: "Board not found" });
        }
        if (card.list.boardId !== boardId) {
            return res.status(403).json({ message: "Can not " });
        }
    }
    const activity = await prisma.activityLog.create({
        data: {
            action,
            boardId,
            cardId,
            userId
        },
        include: {
            user: { select: { id: true, username: true, avatar: true } }
        }
    })

    getIO().to(`board:${boardId}`).emit("activity:created", {
        activity,
    });

    return res.status(201).json({
        message: "Activity created successfully",
        activity
    });
}










/**
 * @description Get Board Activity
 * @route /api/activities/board/:id
 * @method get
 * @access private (Owner , Admin , Member)
 */

export const getBoardActivities = async (
    req: Request<any, {}, any, any>,
    res: Response
) => {
    const { action, userId } = req.query;
    const whereCondition: any = {};
    const boardId = Number(req.params.id);
    whereCondition.boardId = Number(boardId);

    const board = await prisma.board.findUnique({
        where: { id: boardId },
    })
    if (!board) {
        return res.status(404).json({ message: "Board not found" });
    }
    const { page, limit } = req.query;
    const skip = (page - 1) * limit;
    if (action) {
        whereCondition.action = { contains: String(action) }
    }
    if (userId) {
        whereCondition.userId = Number(userId)
    }
    const [activities, totalActivities] = await prisma.$transaction([
        prisma.activityLog.findMany({
            where: whereCondition,
            include: {
                user: { select: { id: true, username: true, avatar: true } },
                card: { select: { id: true, title: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: skip,
            take: limit,
        }),

        prisma.activityLog.count({
            where: whereCondition,
        }),
    ]);

    const totalPages = Math.ceil(totalActivities / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    return res.status(200).json({
        message: "Activities retrieved successfully",
        data: activities,
        pagination: {
            totalItems: totalActivities,
            totalPages,
            currentPage: page,
            limit,
            hasNextPage,
            hasPrevPage,
        },
    });
}



/**
 * @description Get Card Activity
 * @route /api/activities/card/:id
 * @method get
 * @access private (Owner , Admin , Member)
 */

export const getCardActivities = async (
    req: Request<any, {}, any, any>,
    res: Response
) => {
    const cardId = Number(req.params.id);
    const card = await prisma.card.findUnique({
        where: { id: cardId },
    })
    if (!card) {
        return res.status(404).json({ message: "Card not found" });
    }
    const { page, limit } = req.query;
    const skip = (page - 1) * limit;
    const [activities, totalActivities] = await prisma.$transaction([
        prisma.activityLog.findMany({
            where: { cardId: cardId },
            include: {
                user: { select: { id: true, username: true, avatar: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip: skip,
            take: limit
        }),
        prisma.activityLog.count({
            where: { cardId: cardId },
        }),
    ])
    const totalPages = Math.ceil(totalActivities / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    return res.status(200).json({
        message: "Activities retrieved successfully",
        data: activities,
        pagination: {
            totalItems: totalActivities,
            totalPages,
            currentPage: page,
            limit,
            hasNextPage,
            hasPrevPage,
        },
    });
}