import { z } from "zod";

export const createCommentSchema = z.object({
    text: z.string().trim().min(1, "Comment must have at least length 1").max(500, "Comment is too long !"),
    cardId: z.coerce.number().int().positive("Card id must be a positive integer"),
});


export const updateCommentSchema = z.object({
    text: z.string().trim().min(1, "Comment must have at least length 1").max(500, "Comment is too long !"),
});



export type CreateCommentInput= z.infer<typeof createCommentSchema>;

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

