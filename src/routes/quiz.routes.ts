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
  getTrash,
  restoreQuestionController,
  deleteQuestionPermanentlyController,
  deleteQuizPermanentlyController,
  exportBackup,
  importBackup,
  bulkEditQuestions,
  getDuplicateQuestions,
  resolveDuplicateQuestions,
  exportQuizReportCSV,
  exportQuizReportExcel,
} from "../controllers/quiz.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth.middleware";

const router = Router();

// Master Question Bank Upload Route
router.post(
  "/upload",
  authenticate,
  authorizeAdmin,
  upload.single("file"),
  uploadQuestions
);

// Master Bank Explorer Routes
router.get("/bank/questions", authenticate, authorizeAdmin, getBankQuestions);
router.post("/bank/questions/bulk-edit", authenticate, authorizeAdmin, bulkEditQuestions);
router.get("/bank/questions/duplicates", authenticate, authorizeAdmin, getDuplicateQuestions);
router.post("/bank/questions/duplicates/resolve", authenticate, authorizeAdmin, resolveDuplicateQuestions);

// Admin Stats Route
router.get("/admin/stats", authenticate, authorizeAdmin, getAdminStats);

// Upload Image Route
router.post("/upload-image", authenticate, authorizeAdmin, upload.single("image"), uploadImageController);

// Quiz CRUD & Administration
router.post("/create", authenticate, authorizeAdmin, create);
router.put("/:quizId", authenticate, authorizeAdmin, updateQuizController);
router.post("/:quizId/questions", authenticate, authorizeAdmin, add);
router.patch("/:quizId/trash", authenticate, authorizeAdmin, trashQuiz);
router.patch("/:quizId/restore", authenticate, authorizeAdmin, restoreQuizController);
router.delete("/:quizId/permanent", authenticate, authorizeAdmin, deleteQuizPermanentlyController);

// Reports Export
router.get("/:quizId/report/csv", authenticate, authorizeAdmin, exportQuizReportCSV);
router.get("/:quizId/report/excel", authenticate, authorizeAdmin, exportQuizReportExcel);

// Question Management
router.put("/question/:questionId", authenticate, authorizeAdmin, update);
router.delete("/question/:questionId", authenticate, authorizeAdmin, remove);
router.get("/question/:questionId/versions", authenticate, authorizeAdmin, getVersions);
router.post("/question/:questionId/versions/:versionId/restore", authenticate, authorizeAdmin, restoreVersion);
router.patch("/question/:questionId/status", authenticate, authorizeAdmin, updateStatus);
router.post("/question/:questionId/comments", authenticate, authorizeAdmin, addComment);
router.get("/question/:questionId/comments", authenticate, authorizeAdmin, getComments);
router.patch("/question/:questionId/restore-trash", authenticate, authorizeAdmin, restoreQuestionController);
router.delete("/question/:questionId/permanent", authenticate, authorizeAdmin, deleteQuestionPermanentlyController);

// Trash Explorer
router.get("/trash/items", authenticate, authorizeAdmin, getTrash);

// Backup System
router.get("/backup/export", authenticate, authorizeAdmin, exportBackup);
router.post("/backup/import", authenticate, authorizeAdmin, importBackup);

// ── Candidate Endpoints ──────────────────────────────────────────────────────
router.get("/", authenticate, getAll);
router.get("/history", authenticate, history);
router.get("/attempt/:attemptId", authenticate, getAttempt);
router.get("/:quizId", authenticate, getQuiz);
router.post("/:quizId/start", authenticate, startAttempt);
router.post("/:quizId/submit", authenticate, submit);

export default router;