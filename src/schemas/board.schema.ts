import { z } from "zod";

export const createNewBoardSchema = z.object({
  title: z.string().trim().min(3, "Title is too short !").max(100, "Title is too long !"),
  description: z.string().trim().min(3, "Description is too short !").max(400, "Description is too long !").optional(),
  color: z.string().trim().default("#0079bf"),
});

export const updateBoardSchema = z.object({
  title: z.string().trim().min(3, "Title is too short !").max(100, "Title is too long !").optional(),
  description: z.string().trim().min(3, "Description is too short !").max(400, "Description is too long !").optional(),
  color: z.string().trim().optional(),
});

export const addBoardMemberSchema = z.object({
  userId: z.coerce.number().int().positive("ID must be a positive integer"),
  role: z.enum(["MEMBER", "VIEWER", "ADMIN"]).default("MEMBER"),
});

export const updateBoardMemberSchema = z.object({
  role: z.enum(["MEMBER", "VIEWER", "ADMIN"]),
});

// Types
export type CreateNewBoardInput = z.infer<typeof createNewBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type AddBoardMemberInput = z.infer<typeof addBoardMemberSchema>;
export type UpdateBoardMemberInput = z.infer<typeof updateBoardMemberSchema>;