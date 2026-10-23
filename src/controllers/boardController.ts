import { Request, Response } from "express";
import * as boardService from "../services/boardService";

/**
 * @description Create New Board
 * @route /api/boards
 * @method post
 * @access public
 */
export const createNewBoard = async (req: Request, res: Response) => {
    const board = await boardService.createBoard(req.body, req.user!.id);
    return res.status(201).json({
        message: "Board Created successfully",
        board,
    });
};

/**
 * @description Get Boards of User
 * @route /api/boards
 * @method get
 * @access public
 */
export const getUserBoards = async (req: Request, res: Response) => {
    const { boards, pagination } = await boardService.getUserBoards(
        req.user!.id,
        req.query as any
    );

    return res.status(200).json({
        message: "Boards Shown successfully",
        data: boards,
        pagination,
    });
};

/**
 * @description Get Boards By Id
 * @route /api/boards/:id
 * @method get
 * @access private (Owner And Admin And Member in Board)
 */
export const getBoardById = async (req: Request, res: Response) => {
    const boardId = Number(req.params.id);
    const board = await boardService.getBoardById(boardId);

    return res.status(200).json({
        message: "Board Shown successfully",
        board,
    });
};

/**
 * @description Update Board
 * @route /api/boards/:id
 * @method patch
 * @access private (Owner And Admin)
 */
export const updateBoard = async (req: Request, res: Response) => {
    const boardId = Number(req.params.id);
    const board = await boardService.updateBoard(boardId, req.body);

    return res.status(200).json({
        message: "Board Updated successfully",
        board,
    });
};

/**
 * @description Delete Board
 * @route /api/boards/:id
 * @method Delete
 * @access private (Owner)
 */
export const deleteBoard = async (req: Request, res: Response) => {
    const boardId = Number(req.params.id);
    await boardService.deleteBoard(boardId);

    return res.status(200).json({
        message: "Board Deleted successfully",
    });
};

/**
 * @description Add Member to Board
 * @route /api/boards/:id/members
 * @method post
 * @access private (Owner , Admin)
 */
export const addMemberToBoard = async (req: Request, res: Response) => {
    const boardId = Number(req.params.id);
    const member = await boardService.addMember(boardId, req.body);

    return res.status(201).json({
        message: "Member Added Successfully",
        member,
    });
};

/**
 * @description update Member Role
 * @route /api/boards/:id/members/:userId
 * @method patch
 * @access private (Owner , Admin)
 */
export const updateMemberRole = async (req: Request, res: Response) => {
    const boardId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);

    const member = await boardService.updateMemberRole(
        boardId,
        targetUserId,
        req.user!.id,
        req.body
    );

    return res.status(200).json({
        message: "Member role updated successfully",
        member,
    });
};

/**
 * @description Delete Member from Board
 * @route /api/boards/:id/members/:userId
 * @method delete
 * @access public
 */
export const removeMemberFromBoard = async (req: Request, res: Response) => {
    const boardId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);

    await boardService.removeMember(boardId, targetUserId, req.user!.id);

    return res.status(200).json({
        message: "Member Deleted successfully",
    });
};