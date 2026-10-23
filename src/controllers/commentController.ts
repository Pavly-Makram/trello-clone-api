import { Request, Response } from "express";
import * as commentService from "../services/commentService";

/**
 * @description Create New Comment
 * @route /api/comments
 * @method post
 * @access private (Owner , Admin , Member)
 */
export const createNewComment = async (req: Request, res: Response) => {
    const comment = await commentService.createComment(req.body, req.user!.id);
    return res.status(201).json({
        message: "Comment created successfully",
        comment,
    });
};

/**
 * @description Update Comment
 * @route /api/comments/:id
 * @method patch
 * @access private (Owner , Admin , Member)
 */
export const updateComment = async (req: Request, res: Response) => {
    const commentId = Number(req.params.id);
    const commentUpdated = await commentService.updateComment(
        commentId,
        req.body,
        req.user!.id
    );

    return res.status(200).json({
        message: "Comment updated successfully",
        commentUpdated,
    });
};

/**
 * @description Remove Comment
 * @route /api/comments/:id
 * @method delete
 * @access private (Owner , Admin , Member)
 */
export const removeComment = async (req: Request, res: Response) => {
    const commentId = Number(req.params.id);
    await commentService.removeComment(commentId, req.user!.id);

    return res.status(200).json({
        message: "Comment removed successfully",
    });
};