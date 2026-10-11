import { z } from "zod";

export const updateUserProfileSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(30).optional(),
  avatar: z.string().url("Avatar must be a valid URL").optional(),
});


export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;