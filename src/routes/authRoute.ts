import { Router } from "express";
import { validate } from "../middlewares/validate";
import { 
  loginSchema, 
  registerSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema,
} from "../schemas";
import { 
  login, 
  register, 
  forgotPassword, 
  resetPassword,
  refresh
} from "../controllers/authController";
import { authLimiter , refreshLimiter } from "../middlewares/rateLimiter";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), register);
router.post("/login", authLimiter, validate({ body: loginSchema }), login);
router.post("/forgot-password", authLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
router.post("/reset-password", authLimiter, validate({ body: resetPasswordSchema }), resetPassword);
router.post("/refresh", refreshLimiter, refresh);

export default router;