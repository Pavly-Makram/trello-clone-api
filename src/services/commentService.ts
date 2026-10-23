import prisma from "../config/prisma";
import * as cacheService from "./cacheService";
import * as socketService from "./socketService";
import { CreateCommentInput, UpdateCommentInput } from "../schemas/comment.schema";
import { HttpError } from "../utils/HttpError";

const getCardCacheKey = (cardId: number) => `card:${cardId}`;

export const createComment = async (data: CreateCommentInput, userId: number) => {
    const { text, cardId } = data;

    const comment = await prisma.comment.create({
        data: {
            text,
            cardId,
            userId,
        },
        include: {
            user: { select: { id: true, username: true, avatar: true } },
            card: {
                include: {
                    list: {
                        select: { boardId: true },
                    },
                },
            },
        },
    });

    await cacheService.deleteCache(getCardCacheKey(cardId));

    socketService.emitToBoard(comment.card.list.boardId, "comment:created", {
        comment,
        createdBy: userId,
    });

    return comment;
};

export const updateComment = async (
    commentId: number,
    data: UpdateCommentInput,
    userId: number
) => {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
    });

    if (!comment) {
        throw new HttpError(404, "Comment not found");
    }

    if (userId !== comment.userId) {
        throw new HttpError(403, "You are only allowed to edit your own comments");
    }

    const commentUpdated = await prisma.comment.update({
        where: { id: commentId },
        data: { text: data.text },
        include: {
            user: { select: { id: true, username: true, avatar: true } },
            card: {
                include: {
                    list: {
                        select: { boardId: true },
                    },
                },
            },
        },
    });

    await cacheService.deleteCache(getCardCacheKey(comment.cardId));

    socketService.emitToBoard(commentUpdated.card.list.boardId, "comment:updated", {
        comment: commentUpdated,
        updatedBy: userId,
    });

    return commentUpdated;
};

export const removeComment = async (commentId: number, userId: number) => {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
            card: {
                include: {
                    list: {
                        include: {
                            board: {
                                include: {
                                    members: {
                                        where: { userId },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!comment) {
        throw new HttpError(404, "Comment not found");
    }

    const isAuthor = comment.userId === userId;
    const isBoardOwner = comment.card.list.board.ownerId === userId;
    const isBoardAdmin = comment.card.list.board.members[0]?.role === "ADMIN";

    if (!isAuthor && !isBoardOwner && !isBoardAdmin) {
        throw new HttpError(403, "You do not have permission to delete this comment");
    }

    await prisma.comment.delete({
        where: { id: commentId },
    });

    await cacheService.deleteCache(getCardCacheKey(comment.cardId));

    socketService.emitToBoard(comment.card.list.boardId, "comment:deleted", {
        commentId,
        cardId: comment.cardId,
        deletedBy: userId,
    });
};