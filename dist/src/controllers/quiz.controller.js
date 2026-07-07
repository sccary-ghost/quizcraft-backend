"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDuplicateQuestions = exports.getDuplicateQuestions = exports.bulkEditQuestions = exports.exportQuizReportExcel = exports.exportQuizReportCSV = exports.importBackup = exports.exportBackup = exports.deleteQuizPermanentlyController = exports.deleteQuestionPermanentlyController = exports.restoreQuestionController = exports.getTrash = exports.getComments = exports.addComment = exports.updateStatus = exports.startAttempt = exports.updateQuizController = exports.uploadImageController = exports.getAdminStats = exports.getBankQuestions = exports.restoreQuizController = exports.trashQuiz = exports.remove = exports.restoreVersion = exports.getVersions = exports.update = exports.history = exports.getAttempt = exports.submit = exports.getQuiz = exports.getAll = exports.add = exports.create = void 0;
const quiz_service_1 = require("../services/quiz.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
const duplicateDetector_1 = require("../utils/duplicateDetector");
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
        const { question, optionA, optionB, optionC, optionD, correctAnswer, explanation, subject, chapter, topic, sectionId, tags, } = req.body;
        const result = await (0, quiz_service_1.addQuestion)(quizId, question, optionA, optionB, optionC, optionD, correctAnswer, explanation, subject, chapter, topic, sectionId, tags);
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
        if (!attempt) {
            return res.status(404).json({ message: "Attempt not found" });
        }
        const user = req.user;
        if (user.role !== "ADMIN" && attempt.userId !== user.userId) {
            return res.status(403).json({ message: "Forbidden: You cannot access other candidates' attempts" });
        }
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
        const result = await (0, quiz_service_1.updateQuestion)(questionId, req.body.question, req.body.optionA, req.body.optionB, req.body.optionC, req.body.optionD, req.body.correctAnswer, req.body.explanation, req.body.subject, req.body.chapter, req.body.topic, req.body.status, req.body.tags);
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
                isDeleted: false,
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
        const [totalQuizzes, draftQuizzes, scheduledQuizzes, liveQuizzes, completedQuizzes, archivedQuizzes, questionBank, categoriesResult, users, trash] = await prisma_1.default.$transaction([
            prisma_1.default.quiz.count({ where: { isDeleted: false } }),
            prisma_1.default.quiz.count({ where: { isDeleted: false, status: "Draft" } }),
            prisma_1.default.quiz.count({ where: { isDeleted: false, status: "Scheduled" } }),
            prisma_1.default.quiz.count({ where: { isDeleted: false, status: "Live" } }),
            prisma_1.default.quiz.count({ where: { isDeleted: false, status: "Completed" } }),
            prisma_1.default.quiz.count({ where: { isDeleted: false, status: "Archived" } }),
            prisma_1.default.question.count({ where: { isBank: true } }),
            prisma_1.default.question.groupBy({ by: ["subject"], where: { isBank: true, subject: { not: null } } }),
            prisma_1.default.user.count(),
            prisma_1.default.quiz.count({ where: { isDeleted: true } })
        ]);
        const categories = categoriesResult.length;
        const folders = 0;
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
const getTrash = async (req, res) => {
    try {
        const trash = await (0, quiz_service_1.getTrashItems)();
        res.json(trash);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTrash = getTrash;
const restoreQuestionController = async (req, res) => {
    try {
        const questionId = req.params.questionId;
        const restored = await (0, quiz_service_1.restoreQuestion)(questionId);
        await (0, auditLogger_1.logAuditAction)(req, "Question Restored", questionId);
        res.json({ message: "Question restored successfully", question: restored });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.restoreQuestionController = restoreQuestionController;
const deleteQuestionPermanentlyController = async (req, res) => {
    try {
        const questionId = req.params.questionId;
        await (0, quiz_service_1.deleteQuestionPermanently)(questionId);
        await (0, auditLogger_1.logAuditAction)(req, "Question Deleted Forever", questionId);
        res.json({ message: "Question permanently deleted successfully" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.deleteQuestionPermanentlyController = deleteQuestionPermanentlyController;
const deleteQuizPermanentlyController = async (req, res) => {
    try {
        const quizId = req.params.quizId;
        await (0, quiz_service_1.deleteQuizPermanently)(quizId);
        await (0, auditLogger_1.logAuditAction)(req, "Test Deleted Forever", quizId);
        res.json({ message: "Quiz permanently deleted successfully" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.deleteQuizPermanentlyController = deleteQuizPermanentlyController;
const exportBackup = async (req, res) => {
    try {
        const backupData = await (0, quiz_service_1.exportDatabaseBackup)();
        await (0, auditLogger_1.logAuditAction)(req, "Backup Exported");
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename=quizcraft_backup_${Date.now()}.json`);
        res.send(JSON.stringify(backupData, null, 2));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.exportBackup = exportBackup;
const importBackup = async (req, res) => {
    try {
        const { backupData, strategy } = req.body;
        if (!backupData) {
            return res.status(400).json({ message: "backupData parameter is required" });
        }
        if (strategy !== "merge" && strategy !== "overwrite") {
            return res.status(400).json({ message: "Invalid strategy. Must be 'merge' or 'overwrite'" });
        }
        const currentAdminId = req.user?.userId;
        await (0, quiz_service_1.importDatabaseBackup)(backupData, strategy, currentAdminId);
        await (0, auditLogger_1.logAuditAction)(req, `Backup Restored (${strategy})`);
        res.json({ message: `Database backup imported successfully using ${strategy} strategy` });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.importBackup = importBackup;
const exportQuizReportCSV = async (req, res) => {
    try {
        const quizId = req.params.quizId;
        const quiz = await prisma_1.default.quiz.findUnique({
            where: { id: quizId },
        });
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=quiz_report_${quizId}_${Date.now()}.csv`);
        // Write headers
        res.write(`"Quiz Performance Report"\n`);
        res.write(`"Quiz Title","${quiz.title.replace(/"/g, '""')}"\n`);
        res.write(`"Duration","${quiz.duration} minutes"\n`);
        res.write(`"Exported At","${new Date().toLocaleString()}"\n\n`);
        res.write(`"Candidate Name","Email","Mobile Number","Score","Percentage (%)","Submitted At","Status"\n`);
        // Stream attempts using cursor pagination to avoid OOM
        let hasMore = true;
        let skip = 0;
        const TAKE = 500;
        while (hasMore) {
            const attempts = await prisma_1.default.attempt.findMany({
                where: { quizId },
                include: { user: true },
                orderBy: { submittedAt: "desc" },
                skip,
                take: TAKE,
            });
            if (attempts.length === 0) {
                hasMore = false;
                break;
            }
            for (const att of attempts) {
                const name = att.user.name || "N/A";
                const email = att.user.email || "N/A";
                const mobile = att.user.mobileNumber || "N/A";
                const score = att.score;
                const percentage = att.percentage.toFixed(2);
                const date = att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "In Progress";
                const status = att.completed ? "Completed" : "Ongoing";
                res.write(`"${name.replace(/"/g, '""')}","${email.replace(/"/g, '""')}","${mobile.replace(/"/g, '""')}",${score},${percentage},"${date}","${status}"\n`);
            }
            skip += TAKE;
        }
        await (0, auditLogger_1.logAuditAction)(req, "Test Report Exported (CSV)", quizId);
        res.end();
    }
    catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
        else {
            res.end();
        }
    }
};
exports.exportQuizReportCSV = exportQuizReportCSV;
const exportQuizReportExcel = async (req, res) => {
    try {
        const quizId = req.params.quizId;
        const quiz = await prisma_1.default.quiz.findUnique({
            where: { id: quizId },
        });
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }
        res.setHeader("Content-Type", "application/vnd.ms-excel");
        res.setHeader("Content-Disposition", `attachment; filename=quiz_report_${quizId}_${Date.now()}.xls`);
        res.write(`
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; }
          th { background-color: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
        </style>
      </head>
      <body>
        <h2>Quiz Performance Report</h2>
        <p><strong>Quiz Title:</strong> ${quiz.title}</p>
        <p><strong>Duration:</strong> ${quiz.duration} minutes</p>
        <p><strong>Exported At:</strong> ${new Date().toLocaleString()}</p>
        <br/>
        <table>
          <thead>
            <tr>
              <th>Candidate Name</th>
              <th>Email</th>
              <th>Mobile Number</th>
              <th>Score</th>
              <th>Percentage (%)</th>
              <th>Submitted At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `);
        let hasMore = true;
        let skip = 0;
        const TAKE = 500;
        while (hasMore) {
            const attempts = await prisma_1.default.attempt.findMany({
                where: { quizId },
                include: { user: true },
                orderBy: { submittedAt: "desc" },
                skip,
                take: TAKE,
            });
            if (attempts.length === 0) {
                hasMore = false;
                break;
            }
            for (const att of attempts) {
                const name = att.user.name || "N/A";
                const email = att.user.email || "N/A";
                const mobile = att.user.mobileNumber || "N/A";
                const score = att.score;
                const percentage = att.percentage.toFixed(2);
                const date = att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "In Progress";
                const status = att.completed ? "Completed" : "Ongoing";
                res.write(`
          <tr>
            <td>${name}</td>
            <td>${email}</td>
            <td>${mobile}</td>
            <td>${score}</td>
            <td>${percentage}</td>
            <td>${date}</td>
            <td>${status}</td>
          </tr>
        `);
            }
            skip += TAKE;
        }
        res.write(`
          </tbody>
        </table>
      </body>
      </html>
    `);
        await (0, auditLogger_1.logAuditAction)(req, "Test Report Exported (Excel)", quizId);
        res.end();
    }
    catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
        else {
            res.end();
        }
    }
};
exports.exportQuizReportExcel = exportQuizReportExcel;
const bulkEditQuestions = async (req, res) => {
    try {
        const { questionIds, updates } = req.body;
        if (!Array.isArray(questionIds) || questionIds.length === 0) {
            return res.status(400).json({ message: "questionIds array is required." });
        }
        if (!updates || typeof updates !== "object") {
            return res.status(400).json({ message: "updates object is required." });
        }
        // Delegate to service
        const { bulkEditQuestionsService } = await Promise.resolve().then(() => __importStar(require("../services/quiz.service")));
        await bulkEditQuestionsService(questionIds, updates);
        await (0, auditLogger_1.logAuditAction)(req, `Bulk edited ${questionIds.length} questions`);
        res.json({ message: "Questions bulk updated successfully." });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.bulkEditQuestions = bulkEditQuestions;
const getDuplicateQuestions = async (req, res) => {
    try {
        const questions = await prisma_1.default.question.findMany({
            where: { isBank: true },
            orderBy: { createdAt: "desc" },
        });
        const duplicateGroups = (0, duplicateDetector_1.findDuplicates)(questions, 0.85);
        res.json(duplicateGroups);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDuplicateQuestions = getDuplicateQuestions;
const resolveDuplicateQuestions = async (req, res) => {
    try {
        const { keptId, purgeIds } = req.body;
        if (!keptId || !Array.isArray(purgeIds) || purgeIds.length === 0) {
            return res.status(400).json({ message: "keptId and purgeIds array are required." });
        }
        // Delegate to service
        const { resolveDuplicateQuestionsService } = await Promise.resolve().then(() => __importStar(require("../services/quiz.service")));
        await resolveDuplicateQuestionsService(keptId, purgeIds);
        await (0, auditLogger_1.logAuditAction)(req, `Resolved duplicates: kept ${keptId}, purged ${purgeIds.length} items`);
        res.json({ message: "Duplicates resolved successfully." });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.resolveDuplicateQuestions = resolveDuplicateQuestions;
