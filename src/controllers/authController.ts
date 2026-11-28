import { Request, Response } from "express";
import * as authService from "../services/authService";
import { ENV } from "../config/env";
import { HttpError } from "../utils/HttpError";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 Days

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: ENV.IS_PROD,
    sameSite: "strict" as const,
    path: "/api/auth",
};

const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: REFRESH_COOKIE_MAX_AGE,
    });
};


/**
 * @description Register User
 * @route /api/auth/register
 * @method post
 * @access public
 */
export const register = async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await authService.register(req.body);

    setRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
        message: "User registered successfully",
        user,
        accessToken,
    });
};

/**
 * @description Login User
 * @route /api/auth/login
 * @method post
 * @access public
 */
export const login = async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await authService.login(req.body);

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
        message: "Login successful",
        user,
        accessToken,
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


export const refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
        throw new HttpError(401, "Refresh token is missing");
    }

    try {
        const result = await authService.refreshSession(refreshToken);

        if (result.refreshToken) {
            setRefreshTokenCookie(res, result.refreshToken);
        }

        return res.status(200).json({
            accessToken: result.accessToken,
        });
    } catch (error) {
        res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
        throw error;
    }
};


