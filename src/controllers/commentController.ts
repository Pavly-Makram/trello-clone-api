import { Request, Response } from "express";
import { CreateCommentInput, UpdateCommentInput } from "../schemas/comment.schema"
import prisma from "../config/prisma";
import redis from "../config/redis";
import { getIO } from "../sockets/socket";

const CACHE_TTL = 3600; // (one hour)
const getCardCacheKey = (cardId: number) => `card:${cardId}`;

/**
 * @description Create New Comment
 * @route /api/comments
 * @method post
 * @access private (Owner , Admin , Member)
 */

export const createNewComment = async (
    req: Request<any, {}, CreateCommentInput>,
    res: Response
) => {
    const { text, cardId } = req.body;
    const userId = req.user!.id;

    const comment = await prisma.comment.create({
        data: {
            text,
            cardId,
            userId
        },
        include: {
            user: { select: { id: true, username: true, avatar: true } },
            card: {
                include: {
                    list: {
                        select: { boardId: true }
                    }
                }
            }
        }
    })

    await redis.del(getCardCacheKey(cardId));

    getIO().to(`board:${comment.card.list.boardId}`).emit("comment:created", {
        comment: comment,
        createdBy: req.user!.id,
    });

    return res.status(201).json({
        message: "Comment created successfully",
        comment
    });
}




/**
 * @description Update Comment
 * @route /api/comments/:id
 * @method patch
 * @access private (Owner , Admin , Member)
 */

export const updateComment = async (
    req: Request<any, {}, UpdateCommentInput>,
    res: Response
) => {
    const { text } = req.body;
    const commentId = Number(req.params.id)
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
    })
    if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
    }
    if (req.user!.id !== comment.userId) {
        return res.status(403).json({ message: "You are only allowed to edit your own comments" });
    }
    const commentUpdated = await prisma.comment.update({
        where: { id: commentId },
        data: {
            text,
        },
        include: {
            user: { select: { id: true, username: true, avatar: true } },
            card: {
                include: {
                    list: {
                        select: { boardId: true }
                    }
                }
            }
        }
    })
    await redis.del(getCardCacheKey(comment.cardId));
    getIO().to(`board:${commentUpdated.card.list.boardId}`).emit("comment:updated", {
        comment: commentUpdated,
        updatedBy: req.user!.id,
    });
    return res.status(200).json({
        message: "Comment updated successfully",
        commentUpdated
    });
}

/**
 * @description Remove Comment
 * @route /api/comments/:id
 * @method delete
 * @access private (Owner , Admin , Member)
 */

export const removeComment = async (req: Request<any, {}, {}>,
    res: Response) => {
    const commentId = Number(req.params.id)
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
                                        where: { userId: req.user!.id }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
    }
    const currentUserId = req.user!.id;

    const isAuthor = comment.userId === currentUserId;

    const isBoardOwner = comment.card.list.board.ownerId === currentUserId;

    const isBoardAdmin = comment.card.list.board.members[0]?.role === "ADMIN";

    if (!isAuthor && !isBoardOwner && !isBoardAdmin) {
        return res.status(403).json({
            message: "You do not have permission to delete this comment"
        });
    }

    await prisma.comment.delete({
        where: { id: commentId },
        include: {
            user: { select: { id: true, username: true, avatar: true } },
            card: {
                include: {
                    list: {
                        select: { boardId: true }
                    }
                }
            }
        }
    })
    await redis.del(getCardCacheKey(comment.cardId));
    getIO().to(`board:${comment.card.list.boardId}`).emit("comment:deleted", {
        commentId: commentId,
        cardId: comment.cardId,
        deletedBy: req.user!.id,
    });
    return res.status(200).json({
        message: "Comment removed successfully",
    });

}