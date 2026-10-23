import { Request, Response } from "express";
import { CreateListInput, UpdateListInput } from "../schemas";
import * as listService from "../services/listService";

export const createNewList = async (
    req: Request<any, {}, CreateListInput>,
    res: Response
) => {
    const list = await listService.createList(req.body, req.user!.id);

    return res.status(201).json({
        message: "List created successfully",
        list,
    });
};

export const updateList = async (
    req: Request<any, {}, UpdateListInput>,
    res: Response
) => {
    const listId = Number(req.params.id);
    const list = await listService.updateList(listId, req.body, req.user!.id);

    return res.status(200).json({
        message: "List updated successfully",
        list,
    });
};

export const deleteList = async (
    req: Request<any, {}, {}>,
    res: Response
) => {
    const listId = Number(req.params.id);
    await listService.deleteList(listId, req.user!.id);

    return res.status(200).json({
        message: "List deleted successfully",
    });
};