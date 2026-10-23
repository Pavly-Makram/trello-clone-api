import prisma from "../config/prisma";
import * as socketService from "./socketService";
import { CreateListInput, UpdateListInput } from "../schemas";


export const createList = async (data: CreateListInput, userId: number) => {
    const list = await prisma.list.create({
        data: {
            title: data.title,
            boardId: data.boardId,
            position: data.position,
        },
    });

    socketService.emitToBoard(data.boardId, "list:created", {
        list,
        createdBy: userId,
    });

    return list;
};


export const updateList = async (listId: number, data: UpdateListInput, userId: number) => {
    const list = await prisma.list.update({
        where: { id: listId },
        data: {
            ...(data.title && { title: data.title }),
            ...(data.position !== undefined && { position: data.position }),
        },
    });

    socketService.emitToBoard(list.boardId, "list:updated", {
        list,
        updatedBy: userId,
    });

    return list;
};


export const deleteList = async (listId: number, userId: number) => {
    const list = await prisma.list.delete({
        where: { id: listId },
    });

    socketService.emitToBoard(list.boardId, "list:deleted", {
        listId: list.id,
        deletedBy: userId,
    });

    return list;
};