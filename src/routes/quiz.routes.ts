import { upload } from "../middleware/upload.middleware";
import { uploadQuestions } from "../controllers/bulkUpload.controller";
import { Router } from "express";
import {
  create,
  add,
  getAll,
  getQuiz,
  submit,
  getAttempt,
  history,
  update,
  remove,
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
  "/history",
  authenticate,
  history
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
router.put(
  "/question/:questionId",
  update
);

router.delete(
  "/question/:questionId",
  remove
);
router.post(
  "/:quizId/upload",
  upload.single("file"),
  uploadQuestions
);
export default router;