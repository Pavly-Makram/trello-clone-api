import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { RegisterInput, LoginInput, ResetPasswordInput, ForgotPasswordInput } from "../schemas/auth.schema";
import prisma from "../config/prisma";
import redis from "../config/redis";

const generateToken = (userId: number, email: string): string => {
  const secret = process.env.JWT_SECRET || "default_super_secret_key";
  return jwt.sign({ id: userId, email }, secret, {
    expiresIn: "7d",
  });
};

/**
 * @description Register User
 * @route /api/auth/register
 * @method post
 * @access public
 */

// ==========================================
// 1. Register Controller
// ==========================================
export const register = async (
  req: Request<{}, {}, RegisterInput>,
  res: Response
) => {
  try {
    const { email, username, password, avatar } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        avatar,
      },
    });

    const token = generateToken(user.id, user.email);

    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).json({
      message: "User registered successfully",
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @description Login User
 * @route /api/auth/login
 * @method post
 * @access public
 */


// ==========================================
// 2. Login Controller 
// ==========================================
export const login = async (
  req: Request<{}, {}, LoginInput>,
  res: Response
) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user.id, user.email);

    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      message: "Login successful",
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};









/**
 * @description Forgot Password - Request Reset Link/Token
 * @route /api/auth/forgot-password
 * @method post
 * @access public
 */
export const forgotPassword = async (
  req: Request<{}, {}, ForgotPasswordInput>,
  res: Response
) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(200).json({
        message: "If that email is registered, a password reset token has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    await redis.setex(`pwd-reset:${resetToken}`, 900, user.id.toString());

    console.log(`\n🔑 [Password Reset Token for ${email}]: ${resetToken}\n`);

    return res.status(200).json({
      message: "If that email is registered, a password reset token has been sent.",
      ...(process.env.NODE_ENV !== "production" && { devResetToken: resetToken }),
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @description Reset Password using Token
 * @route /api/auth/reset-password
 * @method post
 * @access public
 */
export const resetPassword = async (
  req: Request<{}, {}, ResetPasswordInput>,
  res: Response
) => {
  try {
    const { token, newPassword } = req.body;

    // استرجاع الـ userId المرتبط بالتوكن من Redis
    const userId = await redis.get(`pwd-reset:${token}`);

    if (!userId) {
      return res.status(400).json({
        message: "Invalid or expired password reset token",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: Number(userId) },
      data: { password: hashedPassword },
    });

    await redis.del(`pwd-reset:${token}`);

    return res.status(200).json({
      message: "Password has been reset successfully. You can now login.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};