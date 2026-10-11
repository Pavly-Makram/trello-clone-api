import { Request, Response } from "express";
import { CreateNewBoardInput, AddBoardMemberInput, UpdateBoardInput, UpdateBoardMemberInput } from "../schemas/board.schema"
import prisma from "../config/prisma";
import redis from "../config/redis";

const CACHE_TTL = 3600; // (one hour)
const getBoardCacheKey = (boardId: number) => `board:${boardId}`;


/**
 * @description Create New Board
 * @route /api/boards
 * @method post
 * @access public
 */

export const createNewBoard = async (
    req: Request<{}, {}, CreateNewBoardInput>,
    res: Response
) => {
    const { title, description, color } = req.body;
    const ownerId = req.user!.id;
    const board = await prisma.board.create({
        data: {
            title,
            description,
            color,
            ownerId
        }
    })
    return res.status(201).json({
        message: "Board Created successfully",
        board
    });
}


/**
 * @description Get Boards of User
 * @route /api/boards
 * @method get
 * @access public
 */


export const getUserBoards = async (req: Request<{}, {}, any, any>,
    res: Response) => {
    const userIdToken = req.user!.id;
    const { page, limit, title, role } = req.query;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};
    if (role === "OWNER") {
        whereCondition.ownerId = userIdToken;
    } else if (role === "MEMBER") {
        whereCondition.members = { some: { userId: userIdToken } };
    } else {
        whereCondition.OR = [
            { ownerId: userIdToken },
            { members: { some: { userId: userIdToken } } }
        ];
    }
    if (title) {
        whereCondition.title = { contains: String(title) };
    }
    const [boards, totalBoards] = await prisma.$transaction([
        prisma.board.findMany({
            where: whereCondition
            ,
            orderBy: { createdAt: 'desc' },
            skip: skip,
            take: limit
        }),
        prisma.board.count({
            where: whereCondition
        })
    ])

    const totalPages = Math.ceil(totalBoards / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    return res.status(200).json({
        message: "Boards Shown successfully",
        data: boards,
        pagination: {
            totalItems: totalBoards,
            totalPages,
            currentPage: page,
            limit,
            hasNextPage,
            hasPrevPage,
        },
    })
}


/**
 * @description Get Boards By Id
 * @route /api/boards/:id
 * @method get
 * @access private (Owner And Admin And Member in Board)
 */


export const getBoardById = async (req: Request,
    res: Response) => {
    const boardIdParams = Number(req.params.id);
    const cacheKey = getBoardCacheKey(boardIdParams);
    try {
        const cachedBoard = await redis.get(cacheKey);
        if (cachedBoard) {
            return res.status(200).json({
                message: "Board Shown successfully (from cache)",
                board: JSON.parse(cachedBoard)
            });
        }
        const board = await prisma.board.findUnique({
            where: { id: boardIdParams }
            ,
            include: {
                lists: {
                    orderBy: { position: 'asc' },
                    include: {
                        cards: {
                            orderBy: { position: 'asc' }
                        }
                    }
                },
                owner: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true
                    }
                },

                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatar: true
                            }
                        }
                    }
                }
            }
        })
        if (!board) {
            return res.status(404).json({
                message: "Board Not Found",
            })
        }
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(board));
        return res.status(200).json({
            message: "Board Shown successfully",
            board
        })

    } catch (error) {
        console.error("Redis Cache Error:", error);
        const board = await prisma.board.findUnique({ where: { id: boardIdParams } });
        return res.status(200).json({ board });
    }
}



/**
 * @description Update Board
 * @route /api/boards/:id
 * @method patch
 * @access private (Owner And Admin)
 */

export const updateBoard = async (req: Request,
    res: Response) => {
    const { title, description, color } = req.body;
    const boardIdParams = Number(req.params.id);
    const board = await prisma.board.update({
        where: { id: boardIdParams },
        data: {
            title,
            description,
            color
        }
    })
    await redis.del(getBoardCacheKey(boardIdParams));
    return res.status(200).json({
        message: "Board Updated successfully",
        board
    })
}



/**
 * @description Delete Board
 * @route /api/boards/:id
 * @method Delete
 * @access private (Owner)
 */


export const deleteBoard = async (req: Request,
    res: Response) => {
    const boardIdParams = Number(req.params.id);
    await prisma.board.delete({
        where: { id: boardIdParams },
    })

    await redis.del(getBoardCacheKey(boardIdParams));
    return res.status(200).json({
        message: "Board Deleted successfully",
    })
}







/**
 * @description Add Member to Board
 * @route /api/boards/:id/members
 * @method post
 * @access private (Owner , Admin)
 */


export const addMemberToBoard = async (
    req: Request<any, {}, AddBoardMemberInput>,
    res: Response) => {
    const boardIdParams = Number(req.params.id);
    const userId = Number(req.body.userId)
    const existUser = await prisma.user.findUnique({
        where: { id: userId },
    })

    if (!existUser) {
        return res.status(404).json({ message: "User not found" });
    }

    const board = await prisma.board.findUnique({
        where: { id: boardIdParams }
    });

    if (!board) {
        return res.status(404).json({ message: "Board not found" });
    }

    if (board.ownerId === userId) {
        return res.status(400).json({ message: "User is the owner of this board" });
    }

    const existingMember = await prisma.boardMember.findUnique({
        where: {
            userId_boardId: {
                userId,
                boardId: boardIdParams,
            },
        },
    });

    if (existingMember) {
        return res.status(409).json({ message: "User is already a member of this board" });
    }


    const member = await prisma.boardMember.create({
        data: { boardId: boardIdParams, userId: userId, role: req.body.role },
    })
    await redis.del(getBoardCacheKey(boardIdParams));
    return res.status(201).json({
        message: "Member Added Successfully",
        member
    });

}


/**
 * @description update Member Role
 * @route /api/boards/:id/members/:userId
 * @method patch
 * @access private (Owner , Admin)
 */


export const updateMemberRole = async (
    req: Request<any, {}, UpdateBoardMemberInput>,
    res: Response) => {
    const boardIdParams = Number(req.params.id);
    const userId = Number(req.params.userId)
    const existUser = await prisma.user.findUnique({
        where: { id: userId },
    })

    if (!existUser) {
        return res.status(404).json({ message: "User not found" });
    }

    const board = await prisma.board.findUnique({
        where: { id: boardIdParams }
    });

    if (!board) {
        return res.status(404).json({ message: "Board not found" });
    }

    if (req.user!.id === userId) {
        return res.status(400).json({ message: "User can't Update himself" });
    }
    const member = await prisma.boardMember.findUnique({
        where: {
            userId_boardId: {
                userId,
                boardId: boardIdParams,
            }
        }
    });

    if (!member) {
        return res.status(404).json({ message: "Member not found in this board" });
    }

    if (member.role === "ADMIN" && board.ownerId !== req.user!.id) {
        return res.status(403).json({
            message: "Only the board owner can modify another admin's role"
        });
    }


    const updatedMember = await prisma.boardMember.update({
        where: {
            userId_boardId: {
                userId,
                boardId: boardIdParams,
            }
        },
        data: {
            role: req.body.role,
        }
    });
    await redis.del(getBoardCacheKey(boardIdParams));
    return res.status(200).json({
        message: "Member role updated successfully",
        member: updatedMember
    });

}


/**
 * @description Delete Member from Board
 * @route /api/boards/:id/members/:userId
 * @method delete
 * @access public
 */




export const removeMemberFromBoard = async (
    req: Request<any>,
    res: Response) => {
    const boardIdParams = Number(req.params.id);
    const userId = Number(req.params.userId)
    const existUser = await prisma.user.findUnique({
        where: { id: userId },
    })

    if (!existUser) {
        return res.status(404).json({ message: "User not found" });
    }

    const board = await prisma.board.findUnique({
        where: { id: boardIdParams }
    });

    if (!board) {
        return res.status(404).json({ message: "Board not found" });
    }

    if (board.ownerId === userId) {
        return res.status(400).json({
            message: "The board owner cannot leave or be removed from the board"
        });
    }

    const member = await prisma.boardMember.findUnique({
        where: {
            userId_boardId: {
                userId,
                boardId: boardIdParams,
            }
        }
    });

    if (!member) {
        return res.status(404).json({ message: "Member not found in this board" });
    }

    if (member.role === "ADMIN" && board.ownerId !== req.user!.id && req.user!.id !== userId) {
        return res.status(403).json({
            message: "Only the board owner can remove another admin"
        });
    }

    const remover = await prisma.boardMember.findUnique({
        where: {
            userId_boardId: {
                userId: req.user!.id,
                boardId: boardIdParams,
            }
        }
    });

    const isOwner = board.ownerId === req.user!.id;
    const isSelf = userId === req.user!.id;
    const isAdmin = remover?.role === "ADMIN";

    if (!isOwner && !isSelf && !isAdmin) {
        return res.status(403).json({
            message: "Only board admin or owner can remove members"
        });
    }

    await prisma.boardMember.delete({
        where: {
            userId_boardId: {
                userId,
                boardId: boardIdParams,
            }
        }
    });
    await redis.del(getBoardCacheKey(boardIdParams));
    return res.status(200).json({
        message: "Member Deleted successfully",
    });

}