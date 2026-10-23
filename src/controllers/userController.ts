import { Request, Response } from "express";
import * as userService from "../services/userService";

/**
 * @description Get User Profile
 * @route /api/users/profile
 * @method get
 * @access public
 */
export const getUserProfile = async (req: Request, res: Response) => {
    const user = await userService.getUserProfile(req.user!.id);

    return res.status(200).json({
        message: "User Profile retrieved successfully",
        user,
    });
};

/**
 * @description Update User Profile
 * @route /api/users/profile
 * @method patch
 * @access public
 */
export const updateUserProfile = async (req: Request, res: Response) => {
    const user = await userService.updateUserProfile(req.user!.id, req.body);

    return res.status(200).json({
        message: "User Profile updated successfully",
        user,
    });
};

/**
 * @description Delete User Profile
 * @route /api/users/profile
 * @method delete
 * @access public
 */
export const deleteUserProfile = async (req: Request, res: Response) => {
    await userService.deleteUserProfile(req.user!.id);

    return res.status(200).json({
        message: "User Profile deleted successfully",
    });
};

/**
 * @description Search Users
 * @route /api/users/search
 * @method get
 * @access private
 */
export const searchUsers = async (req: Request, res: Response) => {
    const query = (req.query.query as string) || "";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const { users, pagination } = await userService.searchUsers(
        req.user!.id,
        query,
        page,
        limit
    );

    return res.status(200).json({
        message: "Users retrieved successfully",
        data: users,
        pagination,
    });
};