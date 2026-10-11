import { z } from "zod";

export const createNewCardSchema = z.object({
    title: z.string().trim().min(3, "Title is too short !").max(100, "Title is too long !"),
    description: z.string().trim().min(3, "Description is too short !").max(400, "Description is too long !").optional(),
    position: z.coerce.number().positive("Position must be a positive number"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    listId: z.coerce.number().int().positive("List id must be a positive integer"),
    dueDate: z.coerce.date().optional(),
});



export const updateCardSchema = z.object({
    title: z.string().trim().min(3, "Title is too short !").max(100, "Title is too long !").optional(),
    description: z.string().trim().min(3, "Description is too short !").max(400, "Description is too long !").optional(),
    position: z.coerce.number().positive("Position must be a positive number").optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    dueDate: z.coerce.date().nullable().optional(),
});



export const moveCardSchema = z.object({
    listId: z.coerce.number().int().positive("List id must be a positive integer"),
    position: z.coerce.number().positive("Position must be a positive number"),
});


export const cardAssigneeSchema = z.object({
    userId: z.coerce.number().int().positive("User ID must be a positive integer"),
});



export type CreateNewCardInput = z.infer<typeof createNewCardSchema>;

export type UpdateCardInput = z.infer<typeof updateCardSchema>;

export type MoveCardInput = z.infer<typeof moveCardSchema>;

export type CardAssigneeInput = z.infer<typeof cardAssigneeSchema>;