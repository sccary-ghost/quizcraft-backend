"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const upload_middleware_1 = require("../middleware/upload.middleware");
const bulkUpload_controller_1 = require("../controllers/bulkUpload.controller");
const express_1 = require("express");
const quiz_controller_1 = require("../controllers/quiz.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Master Question Bank Upload Route
router.post("/upload", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, upload_middleware_1.upload.single("file"), bulkUpload_controller_1.uploadQuestions);
// Master Bank Explorer Routes
router.get("/bank/questions", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.getBankQuestions);
router.post("/bank/questions/bulk-edit", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.bulkEditQuestions);
router.get("/bank/questions/duplicates", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.getDuplicateQuestions);
router.post("/bank/questions/duplicates/resolve", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.resolveDuplicateQuestions);
// Admin Stats Route
router.get("/admin/stats", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.getAdminStats);
// Upload Image Route
router.post("/upload-image", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, upload_middleware_1.upload.single("image"), quiz_controller_1.uploadImageController);
// Quiz CRUD & Administration
router.post("/create", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.create);
router.put("/:quizId", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.updateQuizController);
router.post("/:quizId/questions", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.add);
router.patch("/:quizId/trash", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.trashQuiz);
router.patch("/:quizId/restore", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.restoreQuizController);
router.delete("/:quizId/permanent", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.deleteQuizPermanentlyController);
// Reports Export
router.get("/:quizId/report/csv", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.exportQuizReportCSV);
router.get("/:quizId/report/excel", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.exportQuizReportExcel);
// Question Management
router.put("/question/:questionId", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.update);
router.delete("/question/:questionId", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.remove);
router.get("/question/:questionId/versions", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.getVersions);
router.post("/question/:questionId/versions/:versionId/restore", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.restoreVersion);
router.patch("/question/:questionId/status", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.updateStatus);
router.post("/question/:questionId/comments", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.addComment);
router.get("/question/:questionId/comments", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.getComments);
router.patch("/question/:questionId/restore-trash", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.restoreQuestionController);
router.delete("/question/:questionId/permanent", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.deleteQuestionPermanentlyController);
// Trash Explorer
router.get("/trash/items", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.getTrash);
// Backup System
router.get("/backup/export", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.exportBackup);
router.post("/backup/import", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, quiz_controller_1.importBackup);
// ── Candidate Endpoints ──────────────────────────────────────────────────────
router.get("/", auth_middleware_1.authenticate, quiz_controller_1.getAll);
router.get("/history", auth_middleware_1.authenticate, quiz_controller_1.history);
router.get("/attempt/:attemptId", auth_middleware_1.authenticate, quiz_controller_1.getAttempt);
router.get("/:quizId", auth_middleware_1.authenticate, quiz_controller_1.getQuiz);
router.post("/:quizId/start", auth_middleware_1.authenticate, quiz_controller_1.startAttempt);
router.post("/:quizId/submit", auth_middleware_1.authenticate, quiz_controller_1.submit);
exports.default = router;
