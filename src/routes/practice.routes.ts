import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  createSession,
  getStats,
  getRecommended,
  getSessionDetails,
  submitSessionAnswer,
  finishSession,
} from "../controllers/practice.controller";

const router = Router();

// Protect all routes
router.use(authenticate);

router.post("/generate", createSession);
router.get("/stats", getStats);
router.get("/recommended", getRecommended);
router.get("/session/:id", getSessionDetails);
router.post("/session/:id/submit-answer", submitSessionAnswer);
router.post("/session/:id/finish", finishSession);

export default router;
