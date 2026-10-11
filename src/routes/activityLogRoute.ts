import { Router } from "express";
import { validate } from "../middlewares/validate";
import { createActivitySchema, idParamSchema, paginationQuerySchema,getActivityBoardQuerySchema } from "../schemas";
import { createNewActivity, getBoardActivities, getCardActivities } from "../controllers/activityLogController";
import { verifyToken, verifyCardAccess, verifyBoardAccess } from "../middlewares/verifyToken";
const router = Router();

router.post("/", verifyToken, validate({ body: createActivitySchema }), verifyBoardAccess("MEMBER"), createNewActivity)

router.get("/board/:id", verifyToken, validate({ params: idParamSchema, query: getActivityBoardQuerySchema }), verifyBoardAccess(), getBoardActivities)

router.get("/card/:id", verifyToken, validate({ params: idParamSchema, query: paginationQuerySchema }), verifyCardAccess(), getCardActivities)



export default router;