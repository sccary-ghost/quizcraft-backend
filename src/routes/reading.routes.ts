import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as readingController from "../controllers/reading.controller";

const router = Router();

router.use(authenticate);

router.post("/progress/:chapterId", readingController.updateProgress);
router.get("/progress/:chapterId", readingController.getProgress);

router.post("/history", readingController.logHistory);

router.post("/session", readingController.startSession);
router.put("/session/:sessionId", readingController.endSession);

export default router;
