import { Router } from "express";
import { validate } from "../middlewares/validate";
import { createNewCardSchema, idParamSchema, doubleIdParamSchema, updateCardSchema, cardAssigneeSchema, moveCardSchema, getCardsQuerySchema } from "../schemas";
import { createNewCard, getAllCards, getCardById, updateCard, deleteCard, moveCard, assignUser, unassignUser } from "../controllers/cardController";
import { verifyToken, verifyCardAccess, verifyListAccess } from "../middlewares/verifyToken";
const router = Router();

router.post("/", verifyToken, validate({ body: createNewCardSchema }), verifyListAccess("MEMBER"), createNewCard)

router.get("/:id", verifyToken, validate({ params: idParamSchema }), verifyCardAccess(), getCardById)

router.get("/", verifyToken, validate({ query: getCardsQuerySchema }), getAllCards)

router.patch("/:id", verifyToken, validate({ body: updateCardSchema, params: idParamSchema }), verifyCardAccess("MEMBER"), updateCard)

router.delete("/:id", verifyToken, validate({ params: idParamSchema }), verifyCardAccess("MEMBER"), deleteCard)


router.patch("/:id/move", verifyToken, validate({ body: moveCardSchema, params: idParamSchema }), verifyCardAccess("MEMBER"), moveCard)

router.post("/:id/assignees", verifyToken, validate({ body: cardAssigneeSchema, params: idParamSchema }), verifyCardAccess("MEMBER"), assignUser)

router.delete("/:id/assignees/:userId", verifyToken, validate({ params: doubleIdParamSchema }), verifyCardAccess("MEMBER"), unassignUser)


export default router;