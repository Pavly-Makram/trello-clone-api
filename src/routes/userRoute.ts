import { Router } from "express";
import { validate } from "../middlewares/validate";
import { updateUserProfileSchema , searchUserQuerySchema} from "../schemas";
import {getUserProfile , updateUserProfile ,deleteUserProfile,searchUsers} from "../controllers/userController";
import { verifyToken, checkUserExists} from "../middlewares/verifyToken";


const router = Router();

router.get("/profile", verifyToken,checkUserExists, getUserProfile);

router.patch("/profile", verifyToken , checkUserExists ,validate({body : updateUserProfileSchema}), updateUserProfile);

router.delete("/profile", verifyToken , checkUserExists , deleteUserProfile);

router.get("/search", verifyToken, checkUserExists, validate({ query: searchUserQuerySchema }), searchUsers);
export default router;