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
  getBankQuestions,
  trashQuiz,
  restoreQuizController,
  getAdminStats,
} from "../controllers/quiz.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Master Question Bank Upload Route
router.post(
  "/upload",
  upload.single("file"),
  uploadQuestions
);

// Master Bank Explorer Route
router.get("/bank/questions", getBankQuestions);

// Admin Stats Route
router.get("/admin/stats", getAdminStats);

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

router.patch(
  "/:quizId/trash",
  trashQuiz
);

router.patch(
  "/:quizId/restore",
  restoreQuizController
);

export default router;