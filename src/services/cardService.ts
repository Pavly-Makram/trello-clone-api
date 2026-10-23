import {
    CreateNewCardInput,
    MoveCardInput,
    UpdateCardInput,
    GetCardsQueryInput,
} from "../schemas";
import prisma from "../config/prisma";
import * as socketService from "./socketService";
import { HttpError } from "../utils/HttpError";
import * as cacheService from "./cacheService";

const CACHE_TTL = 3600;
const getCardCacheKey = (cardId: number) => `card:${cardId}`;

/**
 * @description Create a new card and broadcast to the board
 */
export const createNewCard = async (data: CreateNewCardInput, userId: number) => {
    const card = await prisma.card.create({
        data: {
            title: data.title,
            description: data.description,
            position: data.position,
            priority: data.priority,
            listId: data.listId,
            dueDate: data.dueDate,
        },
        include: { list: { select: { boardId: true } } },
    });

    socketService.emitToBoard(card.list.boardId, "card:created", {
        card,
        cardCreatedBy: userId,
    });

    return card;
};

/**
 * @description Get all cards based on filters
 */
export const getAllCards = async (data: GetCardsQueryInput) => {
    const { title, priority, listId, userId, dueDate } = data;
    const whereCondition: any = {};

    if (title) {
        whereCondition.title = { contains: String(title) };
    }
    if (priority) {
        whereCondition.priority = priority;
    }
    if (listId) {
        whereCondition.listId = Number(listId);
    }
    if (userId) {
        whereCondition.assignees = {
            some: {
                userId: Number(userId),
            },
        };
    }
    if (dueDate) {
        whereCondition.dueDate = dueDate;
    }

    const cards = await prisma.card.findMany({
        where: whereCondition,
    });

    return cards;
};

/**
 * @description Get card details with assignees and comments (cached in Redis)
 */
export const getCardById = async (cardId: number) => {
    const cacheKey = getCardCacheKey(cardId);

    const cachedCard = await cacheService.getCache(cacheKey);
    if (cachedCard) {
        return cachedCard;
    }

    const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
            assignees: {
                select: { user: { select: { id: true, username: true, avatar: true } } },
            },
            comments: {
                orderBy: { createdAt: "desc" },
                include: { user: { select: { id: true, username: true, avatar: true } } },
            },
        },
    });

    if (!card) {
        throw new HttpError(404, "Card not found");
    }

    await cacheService.setCache(cacheKey, card, CACHE_TTL);

    return card;
};

/**
 * @description Update card details, delete cache, and notify board members
 */
export const updateCard = async (
    cardId: number,
    data: UpdateCardInput,
    userId: number
) => {
    const { title, description, position, priority, dueDate } = data;

    const card = await prisma.card.update({
        where: { id: cardId },
        data: {
            ...(title && { title }),
            ...(description && { description }),
            ...(position && { position }),
            ...(priority && { priority }),
            ...(dueDate !== undefined && { dueDate }),
        },
        include: { list: { select: { boardId: true } } },
    });

    await cacheService.deleteCache(getCardCacheKey(cardId));

    socketService.emitToBoard(card.list.boardId, "card:updated", {
        card,
        cardUpdatedBy: userId,
    });

    return card;
};

/**
 * @description Delete card, clear cache, and notify board members
 */
export const deleteCard = async (cardId: number, userId: number) => {
    const deletedCard = await prisma.card.delete({
        where: { id: cardId },
        include: { list: { select: { boardId: true } } },
    });

    await cacheService.deleteCache(getCardCacheKey(cardId));

    socketService.emitToBoard(deletedCard.list.boardId, "card:deleted", {
        cardId: deletedCard.id,
        listId: deletedCard.listId,
        deletedBy: userId,
    });

    return deletedCard;
};

/**
 * @description Move card between lists within the same board
 */
export const moveCard = async (
    cardId: number,
    data: MoveCardInput,
    userId: number
) => {
    const { listId, position } = data;

    const list = await prisma.list.findUnique({
        where: { id: listId },
        include: { board: true },
    });

    if (!list) {
        throw new HttpError(404, "List not found");
    }

    const cardCheck = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
            list: {
                include: {
                    board: true,
                },
            },
        },
    });

    if (list?.boardId !== cardCheck?.list.boardId) {
        throw new HttpError(403, "Cannot move card to a different board");
    }

    const card = await prisma.card.update({
        where: { id: cardId },
        data: {
            ...(listId && { listId }),
            ...(position && { position }),
        },
    });

    await cacheService.deleteCache(getCardCacheKey(cardId));

    socketService.emitToBoard(list.boardId, "card:moved", {
        card,
        movedBy: userId,
    });

    return card;
};

/**
 * @description Assign a board member to a card
 */
export const assignUser = async (cardId: number, userIdToAssign: number) => {
    if (!userIdToAssign) {
        throw new HttpError(404, "User not found");
    }

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

    if (!card) {
        throw new HttpError(404, "Card not found");
    }
    if (!card.list) {
        throw new HttpError(404, "List not found");
    }
    if (!card.list.board) {
        throw new HttpError(404, "Board not found");
    }

    const member = await prisma.boardMember.findUnique({
        where: {
            userId_boardId: {
                userId: userIdToAssign,
                boardId: card.list.boardId,
            },
        },
    });

    if (!member && userIdToAssign !== card.list.board.ownerId) {
        throw new HttpError(403, "User is not a member of this board");
    }

    const cardAssignee = await prisma.cardAssignee.findUnique({
        where: {
            cardId_userId: {
                userId: userIdToAssign,
                cardId: cardId,
            },
        },
    });

    if (cardAssignee) {
        throw new HttpError(409, "User is already assigned to this card");
    }

    const output_card = await prisma.cardAssignee.create({
        data: {
            userId: userIdToAssign,
            cardId: cardId,
        },
    });

    await cacheService.deleteCache(getCardCacheKey(cardId));

    return output_card;
};

/**
 * @description Remove an assigned user from a card
 */
export const unassignUser = async (cardId: number, userIdToUnassign: number) => {
    if (!userIdToUnassign) {
        throw new HttpError(404, "User not found");
    }

    const card = await prisma.card.findUnique({
        where: { id: cardId },
    });

    if (!card) {
        throw new HttpError(404, "Card not found");
    }

    const cardAssignee = await prisma.cardAssignee.findUnique({
        where: {
            cardId_userId: {
                userId: userIdToUnassign,
                cardId: cardId,
            },
        },
    });

    if (!cardAssignee) {
        throw new HttpError(404, "User is not assigned to this card");
    }

    await prisma.cardAssignee.delete({
        where: {
            cardId_userId: {
                userId: userIdToUnassign,
                cardId: cardId,
            },
        },
    });

    await cacheService.deleteCache(getCardCacheKey(cardId));
};