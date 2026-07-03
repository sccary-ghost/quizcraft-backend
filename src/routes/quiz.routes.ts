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
  uploadImageController,
  updateQuizController,
  startAttempt,
  getVersions,
  restoreVersion,
  updateStatus,
  addComment,
  getComments,
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

// Upload Image Route
router.post("/upload-image", upload.single("image"), uploadImageController);

router.post("/create", create);

router.put("/:quizId", updateQuizController);

router.post("/:quizId/start", authenticate, startAttempt);

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

router.get(
  "/question/:questionId/versions",
  getVersions
);

router.post(
  "/question/:questionId/versions/:versionId/restore",
  restoreVersion
);

router.patch(
  "/question/:questionId/status",
  updateStatus
);

router.post(
  "/question/:questionId/comments",
  addComment
);

router.get(
  "/question/:questionId/comments",
  getComments
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