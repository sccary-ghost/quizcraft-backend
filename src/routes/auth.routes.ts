import { Router } from "express";
import {
  register,
  login,
  logout,
  getMe,
  sendOtp,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/otp/send", sendOtp);
router.get("/me", authenticate, getMe);

export default router;