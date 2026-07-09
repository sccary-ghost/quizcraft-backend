import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as vocabularyController from "../controllers/vocabulary.controller";

const router = Router();

router.use(authenticate);

router.post("/words", vocabularyController.addWord);
router.get("/words", vocabularyController.getWords);
router.patch("/words/:id/status", vocabularyController.updateWordStatus);

router.post("/flashcards", vocabularyController.addFlashcard);
router.get("/flashcards", vocabularyController.getFlashcards);
router.patch("/flashcards/:id/review", vocabularyController.reviewFlashcard);

export default router;
