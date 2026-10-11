import { Request, Response } from "express";
import { CreateListInput, UpdateListInput } from "../schemas"
import prisma from "../config/prisma";
import { getIO } from "../sockets/socket";

export const createNewList = async (req: Request<any, {}, CreateListInput>,
    res: Response) => {
    const { title, boardId, position } = req.body;
    const list = await prisma.list.create({
        data: {
            title,
            boardId,
            position
        }
    })
    getIO().to(`board:${boardId}`).emit("list:created", {
        list,
        createdBy: req.user!.id,
    });
    return res.status(201).json({
        message: "List created successfully",
        list
    });

}



export const updateList = async (req: Request<any, {}, UpdateListInput>,
    res: Response) => {
    const { title, position } = req.body;
    const listId = Number(req.params.id)
    const list = await prisma.list.update({
        where: { id: listId },
        data: {
            ...(title && { title }),
            ...(position !== undefined && { position }),
        },
    })
    getIO().to(`board:${list.boardId}`).emit("list:updated", {
        list: list,
        updatedBy: req.user!.id,
    });
    return res.status(200).json({
        message: "List updated successfully",
        list
    });

}


export const deleteList = async (req: Request<any, {}, {}>,
    res: Response) => {
    const listId = Number(req.params.id)
    const list = await prisma.list.delete({
        where: { id: listId },
    })
    getIO().to(`board:${list.boardId}`).emit("list:deleted", {
        listId: listId,
        deletedBy: req.user!.id,
    });
    return res.status(200).json({
        message: "List deleted successfully",
    });

}