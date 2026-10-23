import prisma from "../config/prisma";
import * as cacheService from "./cacheService";
import {
    CreateNewBoardInput,
    UpdateBoardInput,
    AddBoardMemberInput,
    UpdateBoardMemberInput,
    GetBoardsQueryInput,
} from "../schemas";
import { HttpError } from "../utils/HttpError";

const CACHE_TTL = 3600;
const getBoardCacheKey = (boardId: number) => `board:${boardId}`;

export const createBoard = async (data: CreateNewBoardInput, ownerId: number) => {
    return prisma.board.create({
        data: {
            title: data.title,
            description: data.description,
            color: data.color,
            ownerId,
        },
    });
};

export const getUserBoards = async (userId: number, query: GetBoardsQueryInput) => {
    const { page = 1, limit = 10, title, role } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: any = {};
    if (role === "OWNER") {
        whereCondition.ownerId = userId;
    } else if (role === "MEMBER") {
        whereCondition.members = { some: { userId } };
    } else {
        whereCondition.OR = [
            { ownerId: userId },
            { members: { some: { userId } } },
        ];
    }

    if (title) {
        whereCondition.title = { contains: String(title) };
    }

    const [boards, totalBoards] = await prisma.$transaction([
        prisma.board.findMany({
            where: whereCondition,
            orderBy: { createdAt: "desc" },
            skip,
            take: Number(limit),
        }),
        prisma.board.count({ where: whereCondition }),
    ]);

    const totalPages = Math.ceil(totalBoards / Number(limit));

    return {
        boards,
        pagination: {
            totalItems: totalBoards,
            totalPages,
            currentPage: Number(page),
            limit: Number(limit),
            hasNextPage: Number(page) < totalPages,
            hasPrevPage: Number(page) > 1,
        },
    };
};

export const getBoardById = async (boardId: number) => {
    const cacheKey = getBoardCacheKey(boardId);

    const cachedBoard = await cacheService.getCache(cacheKey);
    if (cachedBoard) {
        return cachedBoard;
    }

    const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
            lists: {
                orderBy: { position: "asc" },
                include: {
                    cards: {
                        orderBy: { position: "asc" },
                    },
                },
            },
            owner: {
                select: {
                    id: true,
                    username: true,
                    avatar: true,
                },
            },
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                        },
                    },
                },
            },
        },
    });

    if (!board) {
        throw new HttpError(404, "Board Not Found");
    }

    await cacheService.setCache(cacheKey, board, CACHE_TTL);

    return board;
};

export const updateBoard = async (boardId: number, data: UpdateBoardInput) => {
    const board = await prisma.board.update({
        where: { id: boardId },
        data: {
            title: data.title,
            description: data.description,
            color: data.color,
        },
    });

    await cacheService.deleteCache(getBoardCacheKey(boardId));
    return board;
};

export const deleteBoard = async (boardId: number) => {
    await prisma.board.delete({
        where: { id: boardId },
    });

    await cacheService.deleteCache(getBoardCacheKey(boardId));
};

export const addMember = async (
    boardId: number,
    data: AddBoardMemberInput
) => {
    const userId = Number(data.userId);

    const existUser = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!existUser) {
        throw new HttpError(404, "User not found");
    }

    const board = await prisma.board.findUnique({
        where: { id: boardId },
    });
    if (!board) {
        throw new HttpError(404, "Board not found");
    }

    if (board.ownerId === userId) {
        throw new HttpError(400, "User is the owner of this board");
    }

    const existingMember = await prisma.boardMember.findUnique({
        where: {
            userId_boardId: {
                userId,
                boardId,
            },
        },
    });
    if (existingMember) {
        throw new HttpError(409, "User is already a member of this board");
    }

    const member = await prisma.boardMember.create({
        data: {
            boardId,
            userId,
            role: data.role,
        },
    });

    await cacheService.deleteCache(getBoardCacheKey(boardId));
    return member;
};

export const updateMemberRole = async (
    boardId: number,
    targetUserId: number,
    currentUserId: number,
    data: UpdateBoardMemberInput
) => {
    const existUser = await prisma.user.findUnique({
        where: { id: targetUserId },
    });
    if (!existUser) {
        throw new HttpError(404, "User not found");
    }

    const board = await prisma.board.findUnique({
        where: { id: boardId },
    });
    if (!board) {
        throw new HttpError(404, "Board not found");
    }

    if (currentUserId === targetUserId) {
        throw new HttpError(400, "User can't Update himself");
    }

    const member = await prisma.boardMember.findUnique({
        where: {
            userId_boardId: {
                userId: targetUserId,
                boardId,
            },
        },
    });
    if (!member) {
        throw new HttpError(404, "Member not found in this board");
    }

    if (member.role === "ADMIN" && board.ownerId !== currentUserId) {
        throw new HttpError(403, "Only the board owner can modify another admin's role");
    }

    const updatedMember = await prisma.boardMember.update({
        where: {
            userId_boardId: {
                userId: targetUserId,
                boardId,
            },
        },
        data: { role: data.role },
    });

    await cacheService.deleteCache(getBoardCacheKey(boardId));
    return updatedMember;
};

export const removeMember = async (
    boardId: number,
    targetUserId: number,
    currentUserId: number
) => {
    const existUser = await prisma.user.findUnique({
        where: { id: targetUserId },
    });
    if (!existUser) {
        throw new HttpError(404, "User not found");
    }

    const board = await prisma.board.findUnique({
        where: { id: boardId },
    });
    if (!board) {
        throw new HttpError(404, "Board not found");
    }

    if (board.ownerId === targetUserId) {
        throw new HttpError(400, "The board owner cannot leave or be removed from the board");
    }

    const member = await prisma.boardMember.findUnique({
        where: {
            userId_boardId: {
                userId: targetUserId,
                boardId,
            },
        },
    });
    if (!member) {
        throw new HttpError(404, "Member not found in this board");
    }

    if (member.role === "ADMIN" && board.ownerId !== currentUserId && currentUserId !== targetUserId) {
        throw new HttpError(403, "Only the board owner can remove another admin");
    }

    const remover = await prisma.boardMember.findUnique({
        where: {
            userId_boardId: {
                userId: currentUserId,
                boardId,
            },
        },
    });

    const isOwner = board.ownerId === currentUserId;
    const isSelf = targetUserId === currentUserId;
    const isAdmin = remover?.role === "ADMIN";

    if (!isOwner && !isSelf && !isAdmin) {
        throw new HttpError(403, "Only board admin or owner can remove members");
    }

    await prisma.boardMember.delete({
        where: {
            userId_boardId: {
                userId: targetUserId,
                boardId,
            },
        },
    });

    await cacheService.deleteCache(getBoardCacheKey(boardId));
};