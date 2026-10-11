import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("ID must be a positive integer"),
});

export const doubleIdParamSchema = z.object({
  id: z.coerce.number().int().positive("ID must be a positive integer"),
  userId: z.coerce.number().int().positive("User id must be a positive integer"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .positive("Page must be greater than 0")
    .default(1),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be greater than 0")
    .max(100, "Limit cannot exceed 100")
    .default(10),
});

export const searchUserQuerySchema = paginationQuerySchema.extend({
  query: z.string().trim().optional(),
});

export const getBoardsQuerySchema = paginationQuerySchema.extend({
  title: z.string().trim().optional(),
  role: z.enum(["OWNER", "MEMBER"]).optional(),
});

export const getCardsQuerySchema = paginationQuerySchema.extend({
  title: z.string().trim().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  listId: z.coerce.number().int().positive("List id must be a positive integer").optional(),
  userId: z.coerce.number().int().positive("User id must be a positive integer").optional(),
  dueDate: z.coerce.date().nullable().optional(),

});

export const getActivityBoardQuerySchema = paginationQuerySchema.extend({
  action: z.string().trim().min(1, "Action must have at least length 1").max(300, "Action is too long !").optional(),
  userId: z.coerce.number().int().positive("User id must be a positive integer").optional(),
});


export type IdParamInput = z.infer<typeof idParamSchema>;
export type DoubleIdParamInput = z.infer<typeof doubleIdParamSchema>;
export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;
export type SearchUserQueryInput = z.infer<typeof searchUserQuerySchema>;
export type GetBoardsQueryInput = z.infer<typeof getBoardsQuerySchema>;
export type GetCardsQueryInput = z.infer<typeof getCardsQuerySchema>;
export type GetActivityBoardQueryInput = z.infer<typeof getActivityBoardQuerySchema>;