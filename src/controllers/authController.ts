import { Request, Response } from "express";
import * as authService from "../services/authService";

/**
 * @description Register User
 * @route /api/auth/register
 * @method post
 * @access public
 */
export const register = async (req: Request, res: Response) => {
    const { user, token } = await authService.register(req.body);

    return res.status(201).json({
        message: "User registered successfully",
        user,
        token,
    });
};

/**
 * @description Login User
 * @route /api/auth/login
 * @method post
 * @access public
 */
export const login = async (req: Request, res: Response) => {
    const { user, token } = await authService.login(req.body);

    return res.status(200).json({
        message: "Login successful",
        user,
        token,
    });
};

/**
 * @description Forgot Password
 * @route /api/auth/forgot-password
 * @method post
 * @access public
 */
export const forgotPassword = async (req: Request, res: Response) => {
    const { devResetToken } = await authService.forgotPassword(req.body.email);

    return res.status(200).json({
        message: "If that email is registered, a password reset token has been sent.",
        ...(process.env.NODE_ENV !== "production" && devResetToken && { devResetToken }),
    });
};

/**
 * @description Reset Password
 * @route /api/auth/reset-password
 * @method post
 * @access public
 */
export const resetPassword = async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);

    return res.status(200).json({
        message: "Password has been reset successfully. You can now login.",
    });
};