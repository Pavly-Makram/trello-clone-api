import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

export type BoardRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export function verifyBoardAccess(requiredRole: BoardRole = "MEMBER") {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const boardId = Number(req.params?.boardId || req.body?.boardId || req.params?.id);

            if (!boardId) {
                return res.status(400).json({ message: "Board ID is required" });
            }

            const board = await prisma.board.findUnique({
                where: { id: boardId },
            });

            if (!board) {
                return res.status(404).json({ message: "Board not found" });
            }

            if (board.ownerId === userId) {
                return next();
            }

            if (requiredRole === "OWNER") {
                return res.status(403).json({ message: "Only the board owner can perform this action" });
            }

            const member = await prisma.boardMember.findUnique({
                where: {
                    userId_boardId: {
                        userId,
                        boardId,
                    },
                },
            });

            if (!member) {
                return res.status(403).json({ message: "You are not a member of this board" });
            }

            if (requiredRole === "ADMIN" && member.role !== "ADMIN") {
                return res.status(403).json({ message: "Requires Board Admin privilege" });
            }

            next();
        } catch (error) {
            console.error("verifyBoardAccess Error:", error);
            return res.status(500).json({ message: "Server error verifying board authorization" });
        }
    };
}

export function verifyListAccess(requiredRole: BoardRole = "MEMBER") {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const listId = Number(req.params?.listId || req.body?.listId || req.params?.id);
            if (!listId) {
                return res.status(400).json({ message: "List ID is required" });
            }

            const list = await prisma.list.findUnique({
                where: { id: listId },
                include: { board: true },
            });

            if (!list || !list.board) {
                return res.status(404).json({ message: "List or Board not found" });
            }

            if (list.board.ownerId === userId) {
                return next();
            }

            if (requiredRole === "OWNER") {
                return res.status(403).json({ message: "Only the board owner can perform this action" });
            }

            const member = await prisma.boardMember.findUnique({
                where: {
                    userId_boardId: {
                        userId,
                        boardId: list.boardId,
                    },
                },
            });

            if (!member) {
                return res.status(403).json({ message: "You are not a member of this board" });
            }

            if (requiredRole === "ADMIN" && member.role !== "ADMIN") {
                return res.status(403).json({ message: "Requires Board Admin privilege" });
            }
            if (requiredRole === "MEMBER" && member.role === "VIEWER") {
                return res.status(403).json({ message: "Action not allowed for viewers" });
            }

            next();
        } catch (error) {
            console.error("verifyListAccess Error:", error);
            return res.status(500).json({ message: "Server error verifying list authorization" });
        }
    };
}

export function verifyCardAccess(requiredRole: BoardRole = "MEMBER") {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const cardId = Number(req.params?.cardId || req.body?.cardId || req.params?.id);
            if (!cardId) {
                return res.status(400).json({ message: "Card id is required" });
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

            if (!card || !card.list || !card.list.board) {
                return res.status(404).json({ message: "Card, List or Board not found" });
            }

            if (card.list.board.ownerId === userId) {
                return next();
            }
            if (requiredRole === "OWNER") {
                return res.status(403).json({ message: "Only the board owner can perform this action" });
            }

            const member = await prisma.boardMember.findUnique({
                where: {
                    userId_boardId: {
                        userId,
                        boardId: card.list.boardId,
                    },
                },
            });

            if (!member) {
                return res.status(403).json({ message: "You are not a member of this board" });
            }

            if (requiredRole === "ADMIN" && member.role !== "ADMIN") {
                return res.status(403).json({ message: "Requires Board Admin privilege" });
            }
            if (requiredRole === "MEMBER" && member.role === "VIEWER") {
                return res.status(403).json({ message: "Action not allowed for viewers" });
            }

            next();
        } catch (error) {
            console.error("verifyCardAccess Error:", error);
            return res.status(500).json({ message: "Server error verifying card authorization" });
        }
    };
}