import { Router } from "express";
import { validate } from "../middlewares/validate";
import {createListSchema , idParamSchema, updateListSchema} from "../schemas";
import { createNewList, updateList ,deleteList } from "../controllers/listController";
import { verifyToken, verifyBoardAccess,verifyListAccess } from "../middlewares/verifyToken";
const router = Router();

router.post("/", verifyToken, validate({ body: createListSchema }), verifyBoardAccess("MEMBER"), createNewList)


router.patch("/:id", verifyToken, validate({ body: updateListSchema ,params : idParamSchema}), verifyListAccess("MEMBER"), updateList)


router.delete("/:id", verifyToken, validate({params : idParamSchema}), verifyListAccess("ADMIN"), deleteList)


export default router;