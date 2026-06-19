import { Router } from "express";
import {
  create,
  add,
  getAll,
  getQuiz,
  submit,
  getAttempt,
} from "../controllers/quiz.controller";

import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/create", create);

router.post(
  "/:quizId/questions",
  add
);

router.get(
  "/",
  getAll
);

router.get(
  "/attempt/:attemptId",
  getAttempt
);

router.get(
  "/:quizId",
  getQuiz
);

router.post(
  "/:quizId/submit",
  authenticate,
  submit
);

export default router;