import { z } from "zod";

export const createListSchema = z.object({
    title: z.string().trim().min(3, "Title is too short!").max(100, "Title is too long!"),
    boardId: z.coerce.number().int().positive("Board ID must be a positive integer"),
    position: z.coerce.number().positive("Position must be a positive number"),
});

export const updateListSchema = z.object({
    title: z.string().trim().min(3, "Title is too short!").max(100, "Title is too long!").optional(),
    position: z.coerce.number().positive("Position must be a positive number").optional(),
});


// Types
export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;