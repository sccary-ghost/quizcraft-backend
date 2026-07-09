import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as aiReadingController from "../controllers/aiReading.controller";

const router = Router();

router.use(authenticate);

router.post("/explain", aiReadingController.explain);
router.post("/simplify", aiReadingController.simplify);
router.post("/translate", aiReadingController.translate);
router.post("/summarize", aiReadingController.summarize);
router.post("/extract-vocab", aiReadingController.extractVocab);
router.post("/flashcards", aiReadingController.generateFlashcards);
router.post("/study-quiz", aiReadingController.generateStudyQuiz);

export default router;
