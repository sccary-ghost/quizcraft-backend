import { getMe } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { Router } from "express";
import {
  register,
  login,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get(
  "/me",
  authenticate,
  getMe
);

export default router;