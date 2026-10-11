import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(30),
  password: z.string().min(6, "Password must be at least 6 characters"),
  avatar: z.string().url("Avatar must be a valid URL").optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});


export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});


// Types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;