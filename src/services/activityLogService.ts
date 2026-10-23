import prisma from "../config/prisma";
import * as socketService from "./socketService";
import { CreateActivityInput, GetActivityBoardQueryInput, PaginationQueryInput } from "../schemas";
import { HttpError } from "../utils/HttpError";

/**
 * @description Create new activity log and emit to board room
 */
export const createActivity = async (data: CreateActivityInput, userId: number) => {
    const { action, boardId, cardId } = data;

    if (cardId) {
        const card = await prisma.card.findUnique({
            where: { id: cardId },
            include: {
                list: {
                    include: {
                        board: true,
                    },
                },
            },
        });

        if (!card) throw new HttpError(404, "Card not found");
        if (!card.list) throw new HttpError(404, "List not found");
        if (!card.list.board) throw new HttpError(404, "Board not found");

        if (card.list.boardId !== boardId) {
            throw new HttpError(403, "Can not ");
        }
    }

    const activity = await prisma.activityLog.create({
        data: {
            action,
            boardId,
            cardId,
            userId,
        },
        include: {
            user: { select: { id: true, username: true, avatar: true } },
        },
    });

    socketService.emitToBoard(boardId, "activity:created", { activity });

    return activity;
};

/**
 * @description Get board activities with pagination and filters
 */
export const getBoardActivities = async (
    boardId: number,
    query: GetActivityBoardQueryInput
) => {
    const { action, userId, page = 1, limit = 10 } = query;

    const board = await prisma.board.findUnique({
        where: { id: boardId },
    });

    if (!board) {
        throw new HttpError(404, "Board not found");
    }

    const whereCondition: any = { boardId };
    if (action) whereCondition.action = { contains: String(action) };
    if (userId) whereCondition.userId = Number(userId);

    const skip = (Number(page) - 1) * Number(limit);

    const [activities, totalActivities] = await prisma.$transaction([
        prisma.activityLog.findMany({
            where: whereCondition,
            include: {
                user: { select: { id: true, username: true, avatar: true } },
                card: { select: { id: true, title: true } },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: Number(limit),
        }),
        prisma.activityLog.count({ where: whereCondition }),
    ]);

    const totalPages = Math.ceil(totalActivities / Number(limit));

    return {
        activities,
        pagination: {
            totalItems: totalActivities,
            totalPages,
            currentPage: Number(page),
            limit: Number(limit),
            hasNextPage: Number(page) < totalPages,
            hasPrevPage: Number(page) > 1,
        },
    };
};

/**
 * @description Get card activities with pagination
 */
export const getCardActivities = async (
    cardId: number,
    query: PaginationQueryInput
) => {
    const { page = 1, limit = 10 } = query;

    const card = await prisma.card.findUnique({
        where: { id: cardId },
    });

    if (!card) {
        throw new HttpError(404, "Card not found");
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [activities, totalActivities] = await prisma.$transaction([
        prisma.activityLog.findMany({
            where: { cardId },
            include: {
                user: { select: { id: true, username: true, avatar: true } },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: Number(limit),
        }),
        prisma.activityLog.count({ where: { cardId } }),
    ]);

    const totalPages = Math.ceil(totalActivities / Number(limit));

    return {
        activities,
        pagination: {
            totalItems: totalActivities,
            totalPages,
            currentPage: Number(page),
            limit: Number(limit),
            hasNextPage: Number(page) < totalPages,
            hasPrevPage: Number(page) > 1,
        },
    };
};