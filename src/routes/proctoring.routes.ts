import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { recordViolation, getViolations, getViolationStats } from "../controllers/proctoring.controller";

const router = Router();
router.use(authenticate);

router.post("/:attemptId/violation",  recordViolation);
router.get("/:attemptId/violations",  getViolations);
router.get("/:attemptId/stats",       getViolationStats);

export default router;
