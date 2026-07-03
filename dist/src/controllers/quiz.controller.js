"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComments = exports.addComment = exports.updateStatus = exports.startAttempt = exports.updateQuizController = exports.uploadImageController = exports.getAdminStats = exports.getBankQuestions = exports.restoreQuizController = exports.trashQuiz = exports.remove = exports.restoreVersion = exports.getVersions = exports.update = exports.history = exports.getAttempt = exports.submit = exports.getQuiz = exports.getAll = exports.add = exports.create = void 0;
const quiz_service_1 = require("../services/quiz.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
const create = async (req, res) => {
    try {
        const { title, description, duration, sections, schedulingData } = req.body;
        const result = await (0, quiz_service_1.createQuiz)(title, description, duration, sections, schedulingData);
        const quizId = result.quiz?.id || result.id;
        await (0, auditLogger_1.logAuditAction)(req, "Test Created", quizId);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.create = create;
const add = async (req, res) => {
    try {
        const quizId = req.params.quizId;
        const { question, optionA, optionB, optionC, optionD, correctAnswer, explanation, subject, chapter, topic, sectionId, } = req.body;
        const result = await (0, quiz_service_1.addQuestion)(quizId, question, optionA, optionB, optionC, optionD, correctAnswer, explanation, subject, chapter, topic, sectionId);
        const createdQuestionId = result.question?.id || result.id;
        await (0, auditLogger_1.logAuditAction)(req, "Question Created", createdQuestionId);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.add = add;
const getAll = async (req, res) => {
    try {
        const quizzes = await (0, quiz_service_1.getAllQuizzes)();
        res.json(quizzes);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getAll = getAll;
const getQuiz = async (req, res) => {
    try {
        const quizId = req.params.quizId;
        const isAdmin = req.query.admin === "true";
        const quiz = await (0, quiz_service_1.getQuizById)(quizId, isAdmin);
        res.json(quiz);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getQuiz = getQuiz;
const submit = async (req, res) => {
    try {
        const quizId = req.params.quizId;
        const { answers, questionTimes } = req.body;
        const userId = req.user.userId;
        // This must match the signature of the service function exactly
        const result = await (0, quiz_service_1.submitQuiz)(userId, quizId, answers, questionTimes || {});
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.submit = submit;
const getAttempt = async (req, res) => {
    try {
        const attemptId = req.params.attemptId;
        const attempt = await (0, quiz_service_1.getAttemptById)(attemptId);
        res.json(attempt);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getAttempt = getAttempt;
const history = async (req, res) => {
    try {
        const userId = req.user.userId;
        const attempts = await (0, quiz_service_1.getUserHistory)(userId);
        res.json(attempts);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.history = history;
const update = async (req, res) => {
    try {
        const questionId = req.params.questionId;
        const result = await (0, quiz_service_1.updateQuestion)(questionId, req.body.question, req.body.optionA, req.body.optionB, req.body.optionC, req.body.optionD, req.body.correctAnswer, req.body.explanation, req.body.subject, req.body.chapter, req.body.topic);
        await (0, auditLogger_1.logAuditAction)(req, "Question Edited", questionId);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.update = update;
const getVersions = async (req, res) => {
    try {
        const questionId = req.params.questionId;
        const list = await (0, quiz_service_1.getQuestionVersionsList)(questionId);
        res.json(list);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getVersions = getVersions;
const restoreVersion = async (req, res) => {
    try {
        const questionId = req.params.questionId;
        const versionId = req.params.versionId;
        const restored = await (0, quiz_service_1.restoreQuestionRevision)(questionId, versionId);
        await (0, auditLogger_1.logAuditAction)(req, "Question Restored", questionId);
        res.json({ message: "Version restored successfully", question: restored });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.restoreVersion = restoreVersion;
const remove = async (req, res) => {
    try {
        const questionId = req.params.questionId;
        await (0, quiz_service_1.deleteQuestion)(questionId);
        await (0, auditLogger_1.logAuditAction)(req, "Question Deleted", questionId);
        res.json({ message: "Question deleted successfully" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.remove = remove;
const trashQuiz = async (req, res) => {
    try {
        const quizId = req.params.quizId;
        await (0, quiz_service_1.moveQuizToTrash)(quizId);
        await (0, auditLogger_1.logAuditAction)(req, "Test Deleted", quizId);
        res.json({
            message: "Quiz moved to Trash successfully",
        });
    }
    catch (error) {
        res.status(400).json({
            message: error.message,
        });
    }
};
exports.trashQuiz = trashQuiz;
const restoreQuizController = async (req, res) => {
    try {
        const quizId = req.params.quizId;
        await (0, quiz_service_1.restoreQuiz)(quizId);
        await (0, auditLogger_1.logAuditAction)(req, "Test Restored", quizId);
        res.json({
            message: "Quiz restored successfully",
        });
    }
    catch (error) {
        res.status(400).json({
            message: error.message,
        });
    }
};
exports.restoreQuizController = restoreQuizController;
const getBankQuestions = async (req, res) => {
    try {
        const { subject, chapter } = req.query;
        const questions = await prisma_1.default.question.findMany({
            where: {
                isBank: true,
                ...(subject && { subject: subject }),
                ...(chapter && { chapter: chapter }),
            },
        });
        res.json(questions);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getBankQuestions = getBankQuestions;
const getAdminStats = async (req, res) => {
    try {
        await (0, quiz_service_1.updateQuizStatuses)();
        const totalQuizzes = await prisma_1.default.quiz.count({
            where: { isDeleted: false },
        });
        const draftQuizzes = await prisma_1.default.quiz.count({
            where: { isDeleted: false, status: "Draft" },
        });
        const scheduledQuizzes = await prisma_1.default.quiz.count({
            where: { isDeleted: false, status: "Scheduled" },
        });
        const liveQuizzes = await prisma_1.default.quiz.count({
            where: { isDeleted: false, status: "Live" },
        });
        const completedQuizzes = await prisma_1.default.quiz.count({
            where: { isDeleted: false, status: "Completed" },
        });
        const archivedQuizzes = await prisma_1.default.quiz.count({
            where: { isDeleted: false, status: "Archived" },
        });
        const questionBank = await prisma_1.default.question.count({
            where: { isBank: true },
        });
        // Unique subjects as categories
        const categoriesResult = await prisma_1.default.question.groupBy({
            by: ["subject"],
            where: { isBank: true, subject: { not: null } },
        });
        const categories = categoriesResult.length;
        const folders = 0;
        const users = await prisma_1.default.user.count();
        const trash = await prisma_1.default.quiz.count({
            where: { isDeleted: true },
        });
        // Candidate Stats
        const totalCandidates = users;
        const activeCandidates = await prisma_1.default.user.count({
            where: { isActive: true },
        });
        const inactiveCandidates = await prisma_1.default.user.count({
            where: { isActive: false },
        });
        const totalTestAttempts = await prisma_1.default.attempt.count({
            where: { completed: true },
        });
        res.json({
            totalQuizzes,
            draftQuizzes,
            scheduledQuizzes,
            liveQuizzes,
            completedQuizzes,
            archivedQuizzes,
            questionBank,
            categories,
            folders,
            users,
            trash,
            totalCandidates,
            activeCandidates,
            inactiveCandidates,
            totalTestAttempts,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAdminStats = getAdminStats;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uploadImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
        const uploadsDir = path_1.default.join(__dirname, "../../uploads");
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path_1.default.join(uploadsDir, fileName);
        fs_1.default.writeFileSync(filePath, req.file.buffer);
        const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
        res.json({ url: imageUrl });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.uploadImageController = uploadImageController;
const updateQuizController = async (req, res) => {
    try {
        const quizId = req.params.quizId;
        const { title, description, duration, sections, schedulingData } = req.body;
        const result = await (0, quiz_service_1.updateQuiz)(quizId, title, description, duration, sections, schedulingData);
        await (0, auditLogger_1.logAuditAction)(req, "Test Updated", quizId);
        if (req.body.status === "Published" || result.status === "Published") {
            await (0, auditLogger_1.logAuditAction)(req, "Test Published", quizId);
        }
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateQuizController = updateQuizController;
const startAttempt = async (req, res) => {
    try {
        const quizId = req.params.quizId;
        const userId = req.user.userId;
        const result = await (0, quiz_service_1.startQuizAttempt)(userId, quizId);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.startAttempt = startAttempt;
const updateStatus = async (req, res) => {
    try {
        const questionId = req.params.questionId;
        const status = req.body.status;
        if (!status) {
            return res.status(400).json({ message: "Status parameter is required" });
        }
        const result = await (0, quiz_service_1.updateQuestionStatus)(questionId, status);
        const logAction = status === "Published"
            ? "Question Published"
            : status === "Approved"
                ? "Question Approved"
                : `Question status updated to ${status}`;
        await (0, auditLogger_1.logAuditAction)(req, logAction, questionId);
        res.json({ message: "Status updated successfully", question: result });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateStatus = updateStatus;
const addComment = async (req, res) => {
    try {
        const questionId = req.params.questionId;
        const comment = req.body.comment;
        const authorName = req.body.authorName;
        if (!comment) {
            return res.status(400).json({ message: "Comment is required" });
        }
        const result = await (0, quiz_service_1.addReviewComment)(questionId, comment, authorName);
        res.json({ message: "Comment added successfully", comment: result });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.addComment = addComment;
const getComments = async (req, res) => {
    try {
        const questionId = req.params.questionId;
        const list = await (0, quiz_service_1.getReviewCommentsList)(questionId);
        res.json(list);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getComments = getComments;
