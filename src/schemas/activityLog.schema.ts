import { z } from "zod";

export const createActivitySchema = z.object({
    action: z.string().trim().min(1, "Action must have at least length 1").max(300, "Action is too long !"),
    boardId: z.coerce.number().int().positive("Board id must be a positive integer"),
    cardId: z.coerce.number().int().positive("Card id must be a positive integer").optional(),
});




// Types
export type CreateActivityInput = z.infer<typeof createActivitySchema>;