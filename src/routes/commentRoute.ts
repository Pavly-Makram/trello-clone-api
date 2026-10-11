import { Router } from "express";
import { validate } from "../middlewares/validate";
import { createCommentSchema, updateCommentSchema, idParamSchema } from "../schemas";
import { createNewComment, updateComment, removeComment } from "../controllers/commentController";
import { verifyToken, verifyCardAccess } from "../middlewares/verifyToken";
const router = Router();

router.post("/", verifyToken, validate({ body: createCommentSchema }), verifyCardAccess("MEMBER"), createNewComment)

router.patch("/:id", verifyToken, validate({ body: updateCommentSchema, params: idParamSchema }), updateComment)

router.delete("/:id", verifyToken, validate({ params: idParamSchema }), removeComment)



export default router;