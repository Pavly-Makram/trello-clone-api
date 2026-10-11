import { Router } from "express";
import { validate } from "../middlewares/validate";
import { createNewBoardSchema, idParamSchema, updateBoardSchema, doubleIdParamSchema, addBoardMemberSchema,updateBoardMemberSchema,getBoardsQuerySchema } from "../schemas";
import { createNewBoard, getUserBoards, getBoardById, updateBoard, deleteBoard, addMemberToBoard ,updateMemberRole,removeMemberFromBoard} from "../controllers/boardController";
import { verifyToken, verifyBoardAccess } from "../middlewares/verifyToken";

const router = Router();

router.post("/", verifyToken, validate({ body: createNewBoardSchema }), createNewBoard);

router.get("/", verifyToken, validate({ query: getBoardsQuerySchema }), getUserBoards);

router.get("/:id", verifyToken, validate({ params: idParamSchema }), verifyBoardAccess(), getBoardById);

router.patch("/:id", verifyToken, validate({ params: idParamSchema, body: updateBoardSchema }), verifyBoardAccess("ADMIN"), updateBoard);


router.delete("/:id", verifyToken, validate({ params: idParamSchema }), verifyBoardAccess("OWNER"), deleteBoard);


router.post("/:id/members", verifyToken, validate({ params: idParamSchema, body: addBoardMemberSchema }), verifyBoardAccess("ADMIN"), addMemberToBoard);


router.patch("/:id/members/:userId", verifyToken, validate({ params: doubleIdParamSchema, body: updateBoardMemberSchema }), verifyBoardAccess("ADMIN"), updateMemberRole);


router.delete("/:id/members/:userId", verifyToken, validate({ params: doubleIdParamSchema}), removeMemberFromBoard);


export default router;