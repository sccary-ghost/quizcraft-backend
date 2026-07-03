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
router.patch("/:quizId/trash", quiz_controller_1.trashQuiz);
router.patch("/:quizId/restore", quiz_controller_1.restoreQuizController);
exports.default = router;
