import { Request, Response } from "express";
import * as activityLogService from "../services/activityLogService";

/**
 * @description Create New Activity
 * @route /api/activities
 * @method post
 * @access private (Owner , Admin , Member)
 */
export const createNewActivity = async (req: Request, res: Response) => {
    const activity = await activityLogService.createActivity(req.body, req.user!.id);

    return res.status(201).json({
        message: "Activity created successfully",
        activity,
    });
};

/**
 * @description Get Board Activity
 * @route /api/activities/board/:id
 * @method get
 * @access private (Owner , Admin , Member)
 */
export const getBoardActivities = async (req: Request, res: Response) => {
    const boardId = Number(req.params.id);
    const { activities, pagination } = await activityLogService.getBoardActivities(
        boardId,
        req.query as any
    );

    return res.status(200).json({
        message: "Activities retrieved successfully",
        data: activities,
        pagination,
    });
};

/**
 * @description Get Card Activity
 * @route /api/activities/card/:id
 * @method get
 * @access private (Owner , Admin , Member)
 */
export const getCardActivities = async (req: Request, res: Response) => {
    const cardId = Number(req.params.id);
    const { activities, pagination } = await activityLogService.getCardActivities(
        cardId,
        req.query as any
    );

    return res.status(200).json({
        message: "Activities retrieved successfully",
        data: activities,
        pagination,
    });
};