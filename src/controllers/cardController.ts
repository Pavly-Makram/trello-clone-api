import { Request, Response } from "express";
import { CreateNewCardInput, CardAssigneeInput, MoveCardInput, UpdateCardInput } from "../schemas/card.schema"
import prisma from "../config/prisma";
import redis from "../config/redis";
import { getIO } from "../sockets/socket";

const CACHE_TTL = 3600; // (one hour)
const getCardCacheKey = (cardId: number) => `card:${cardId}`;


/**
 * @description Create New Card
 * @route /api/cards
 * @method post
 * @access public
 */

export const createNewCard = async (
    req: Request<{}, {}, CreateNewCardInput>,
    res: Response
) => {
    const { title, description, position, priority, listId, dueDate } = req.body;
    const card = await prisma.card.create({
        data: {
            title,
            description,
            position,
            priority,
            listId,
            dueDate
        },
        include: { list: { select: { boardId: true } } }
    })
    getIO().to(`board:${card.list.boardId}`).emit("card:created", {
        card,
        cardCreatedBy: req.user!.id,
    });
    return res.status(201).json({
        message: "Card created successfully",
        card
    });
}

/**
 * @description Get All Cards
 * @route /api/cards
 * @method get
 * @access public
 */


export const getAllCards = async (req: Request, res: Response) => {
    const { title, priority, listId, userId, dueDate } = req.query;
    const whereCondition: any = {};
    if (title) {
        whereCondition.title = { contains: String(title) }
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
                userId: Number(userId)
            }
        };
    }
    if (dueDate) {
        whereCondition.dueDate = dueDate;
    }
    const cards = await prisma.card.findMany({
        where: whereCondition
    })

    return res.status(200).json({
        message: "Cards retrieved successfully",
        cards
    });

}
/**
 * @description Get Card By Id
 * @route /api/cards/:id
 * @method get
 * @access public
 */

export const getCardById = async (
    req: Request,
    res: Response
) => {
    const cardId = Number(req.params.id);
    try {
        const cacheKey = getCardCacheKey(cardId);
        const cachedCard = await redis.get(cacheKey);
        if (cachedCard) {
            return res.status(200).json({
                message: "Card Shown successfully (from cache)",
                card: JSON.parse(cachedCard)
            });
        }
        const card = await prisma.card.findUnique({
            where: { id: cardId },
            include: {
                assignees: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatar: true,
                            },
                        },
                    },
                },
                comments: {
                    orderBy: { createdAt: "desc" },
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
        })
        if (!card) {
            return res.status(404).json({ message: "Card not found" });
        }
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(card));

        return res.status(200).json({
            message: "Card retrieved successfully",
            card
        });
    }
    catch (error) {
        console.error("Redis Cache Error:", error);
        const card = await prisma.card.findUnique({ where: { id: cardId } });
        return res.status(200).json({ card });
    }
}




/**
 * @description Update Card
 * @route /api/cards/:id
 * @method patch
 * @access private (Owner , Admin , Member)
 */

export const updateCard = async (
    req: Request<any, {}, UpdateCardInput>,
    res: Response
) => {
    const { title, description, position, priority, dueDate } = req.body;
    const cardId = Number(req.params.id);
    const card = await prisma.card.update({
        where: { id: cardId },
        data: {
            ...(title && { title }),
            ...(description && { description }),
            ...(position && { position }),
            ...(priority && { priority }),
            ...(dueDate !== undefined && { dueDate }),
        },
        include: { list: { select: { boardId: true } } }
    })
    await redis.del(getCardCacheKey(cardId));
    getIO().to(`board:${card.list.boardId}`).emit("card:updated", {
        card,
        cardUpdatedBy: req.user!.id,
    });
    return res.status(200).json({
        message: "Card updated successfully",
        card
    });
}



/**
 * @description Delete Card     
 * @route /api/cards/:id
 * @method delete                
 * @access private (Owner , Admin , Member)
 */

export const deleteCard = async (
    req: Request<any, {}>,
    res: Response
) => {
    const cardId = Number(req.params.id);
    const deletedCard = await prisma.card.delete({
        where: { id: cardId },
        include: { list: { select: { boardId: true } } }
    })
    await redis.del(getCardCacheKey(cardId));
    getIO().to(`board:${deletedCard.list.boardId}`).emit("card:deleted", {
        cardId: deletedCard.id, 
        listId: deletedCard.listId,
        deletedBy: req.user!.id,
    });
    return res.status(200).json({
        message: "Card deleted successfully",
    });
}



/**
 * @description Move Card
 * @route /api/cards/:id/move
 * @method patch
 * @access private (Owner , Admin , Member)
 */

export const moveCard = async (
    req: Request<any, {}, MoveCardInput>,
    res: Response
) => {
    const cardId = Number(req.params.id);
    const { listId, position } = req.body;
    const list = await prisma.list.findUnique({
        where: { id: listId },
        include: { board: true }
    })

    if (!list) {
        return res.status(404).json({ message: "List not found" });
    }

    const cardCheck = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
            list: {
                include: {
                    board: true
                }
            }
        }
    });
    if (list?.boardId !== cardCheck?.list.boardId) {
        return res.status(403).json({
            message: "Cannot move card to a different board",
        });
    }

    const card = await prisma.card.update({
        where: { id: Number(req.params.id) },
        data: {
            ...(listId && { listId }),
            ...(position && { position }),

        },
    })
    await redis.del(getCardCacheKey(cardId));

    const boardId = list.boardId;
    getIO().to(`board:${boardId}`).emit("card:moved", {
        card,
        movedBy: req.user!.id,
    });

    return res.status(200).json({
        message: "Card moved successfully",
        card
    });
}







/**
 * @description Assign User To Card
 * @route /api/cards/:id/assignees
 * @method post
 * @access private (Owner , Admin , Member)
 */

export const assignUser = async (
    req: Request<any, {}, CardAssigneeInput>,
    res: Response
) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(404).json({ message: "User not found" });
    }

    const cardId = Number(req.params.id);
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
    const member = await prisma.boardMember.findUnique({
        where: {
            userId_boardId: {
                userId,
                boardId: card?.list.boardId,
            },
        },
    });

    if (!member && userId !== card.list.board.ownerId) {
        return res.status(403).json({ message: "User is not a member of this board" });
    }
    const cardAssignee = await prisma.cardAssignee.findUnique({
        where: {
            cardId_userId: {
                userId: userId,
                cardId: cardId,
            }
        }
    })
    if (cardAssignee) {
        return res.status(409).json({ message: "User is already assigned to this card" });
    }
    const output_card = await prisma.cardAssignee.create({
        data: {
            userId: userId,
            cardId: cardId
        }
    })
    await redis.del(getCardCacheKey(cardId));
    return res.status(201).json({
        message: "User assigned successfully",
        output_card
    });
}



/**
 * @description Remove assigne from User     
 * @route /api/cards/:id/assignees/:userId
 * @method delete                
 * @access private (Owner , Admin , Member)
 */

export const unassignUser = async (
    req: Request<any, {}>,
    res: Response
) => {
    const userId = Number(req.params.userId);
    if (!userId) {
        return res.status(404).json({ message: "User not found" });
    }

    const cardId = Number(req.params.id);
    const card = await prisma.card.findUnique({
        where: { id: cardId },
    });
    if (!card) {
        return res.status(404).json({ message: "Card not found" });
    }
    const cardAssignee = await prisma.cardAssignee.findUnique({
        where: {
            cardId_userId: {
                userId: userId,
                cardId: cardId,
            }
        }
    })
    if (!cardAssignee) {
        return res.status(404).json({ message: "User is not assigned to this card" });
    }
    await prisma.cardAssignee.delete({
        where: {
            cardId_userId: {
                userId: userId,
                cardId: cardId,
            }
        }
    })
    await redis.del(getCardCacheKey(cardId));
    return res.status(200).json({
        message: "User unassigned successfully",
    });
}