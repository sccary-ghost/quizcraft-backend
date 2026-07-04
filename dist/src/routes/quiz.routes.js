"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const upload_middleware_1 = require("../middleware/upload.middleware");
const bulkUpload_controller_1 = require("../controllers/bulkUpload.controller");
const express_1 = require("express");
const quiz_controller_1 = require("../controllers/quiz.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Master Question Bank Upload Route
router.post("/upload", upload_middleware_1.upload.single("file"), bulkUpload_controller_1.uploadQuestions);
// Master Bank Explorer Route
router.get("/bank/questions", quiz_controller_1.getBankQuestions);
router.post("/bank/questions/bulk-edit", quiz_controller_1.bulkEditQuestions);
router.get("/bank/questions/duplicates", quiz_controller_1.getDuplicateQuestions);
router.post("/bank/questions/duplicates/resolve", quiz_controller_1.resolveDuplicateQuestions);
// Admin Stats Route
router.get("/admin/stats", quiz_controller_1.getAdminStats);
// Upload Image Route
router.post("/upload-image", upload_middleware_1.upload.single("image"), quiz_controller_1.uploadImageController);
router.post("/create", quiz_controller_1.create);
router.put("/:quizId", quiz_controller_1.updateQuizController);
router.post("/:quizId/start", auth_middleware_1.authenticate, quiz_controller_1.startAttempt);
router.post("/:quizId/questions", quiz_controller_1.add);
router.get("/", quiz_controller_1.getAll);
router.get("/history", auth_middleware_1.authenticate, quiz_controller_1.history);
router.get("/attempt/:attemptId", quiz_controller_1.getAttempt);
router.get("/:quizId", quiz_controller_1.getQuiz);
router.post("/:quizId/submit", auth_middleware_1.authenticate, quiz_controller_1.submit);
router.put("/question/:questionId", quiz_controller_1.update);
router.delete("/question/:questionId", quiz_controller_1.remove);
router.get("/question/:questionId/versions", quiz_controller_1.getVersions);
router.post("/question/:questionId/versions/:versionId/restore", quiz_controller_1.restoreVersion);
router.patch("/question/:questionId/status", quiz_controller_1.updateStatus);
router.post("/question/:questionId/comments", quiz_controller_1.addComment);
router.get("/question/:questionId/comments", quiz_controller_1.getComments);
router.get("/trash/items", quiz_controller_1.getTrash);
router.patch("/question/:questionId/restore-trash", quiz_controller_1.restoreQuestionController);
router.delete("/question/:questionId/permanent", quiz_controller_1.deleteQuestionPermanentlyController);
router.delete("/:quizId/permanent", quiz_controller_1.deleteQuizPermanentlyController);
router.get("/backup/export", quiz_controller_1.exportBackup);
router.post("/backup/import", auth_middleware_1.authenticate, quiz_controller_1.importBackup);
router.patch("/:quizId/trash", quiz_controller_1.trashQuiz);
router.patch("/:quizId/restore", quiz_controller_1.restoreQuizController);
exports.default = router;
