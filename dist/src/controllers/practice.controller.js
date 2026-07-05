"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.finishSession = exports.submitSessionAnswer = exports.getSessionDetails = exports.getRecommended = exports.getStats = exports.createSession = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const practice_service_1 = require("../services/practice.service");
const auditLogger_1 = require("../utils/auditLogger");
// 1. Generate Session
const createSession = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { source, filters, adaptive, options } = req.body;
        if (!source) {
            return res.status(400).json({ message: "source is required" });
        }
        const session = await (0, practice_service_1.generatePracticeSession)(userId, source, filters, adaptive, options);
        if (!session) {
            return res.status(500).json({ message: "Failed to generate practice session." });
        }
        await (0, auditLogger_1.logAuditAction)(req, "Practice Session Generated", session.id);
        res.json({ practiceSessionId: session.id, totalQuestions: session.totalQuestions });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createSession = createSession;
// 2. Get Practice Stats
const getStats = async (req, res) => {
    try {
        const userId = req.user.userId;
        const stats = await (0, practice_service_1.getPracticeStats)(userId);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getStats = getStats;
// 3. Get Recommended Practice
const getRecommended = async (req, res) => {
    try {
        const userId = req.user.userId;
        const rec = await (0, practice_service_1.getRecommendations)(userId);
        res.json(rec);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getRecommended = getRecommended;
// 4. Get Session Details (Including active resume index)
const getSessionDetails = async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = req.params.id;
        const session = await prisma_1.default.practiceSession.findFirst({
            where: { id, userId },
            include: {
                questions: {
                    include: { question: true },
                    orderBy: { order: "asc" },
                },
                snapshot: true,
            },
        });
        if (!session) {
            return res.status(404).json({ message: "Practice Session not found" });
        }
        res.json(session);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getSessionDetails = getSessionDetails;
// 5. Submit Single Question Answer (For intermediate saves & resume compatibility)
const submitSessionAnswer = async (req, res) => {
    try {
        const userId = req.user.userId;
        const sessionId = req.params.id;
        const { questionId, selectedAnswer, timeSpent } = req.body;
        if (!questionId) {
            return res.status(400).json({ message: "questionId is required" });
        }
        const session = await prisma_1.default.practiceSession.findFirst({
            where: { id: sessionId, userId },
        });
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        const question = await prisma_1.default.question.findUnique({
            where: { id: questionId },
        });
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }
        const isCorrect = selectedAnswer ? selectedAnswer.trim() === question.correctAnswer.trim() : false;
        // Update PracticeSessionQuestion link
        const psq = await prisma_1.default.practiceSessionQuestion.upsert({
            where: {
                practiceSessionId_questionId: {
                    practiceSessionId: sessionId,
                    questionId,
                },
            },
            update: {
                selectedAnswer,
                isCorrect,
                timeSpent: parseInt(timeSpent) || 0,
            },
            create: {
                practiceSessionId: sessionId,
                questionId,
                selectedAnswer,
                isCorrect,
                timeSpent: parseInt(timeSpent) || 0,
            },
        });
        // Advance session index if it is matching the current question
        const questionsList = await prisma_1.default.practiceSessionQuestion.findMany({
            where: { practiceSessionId: sessionId },
            orderBy: { order: "asc" },
        });
        const currentOrder = questionsList.find((q) => q.questionId === questionId)?.order ?? 0;
        const nextIndex = Math.max(session.currentIndex, currentOrder + 1);
        await prisma_1.default.practiceSession.update({
            where: { id: sessionId },
            data: {
                currentIndex: Math.min(nextIndex, session.totalQuestions - 1),
            },
        });
        // Bookmark Spaced Repetition check: If practicing bookmarks, update their intervals dynamically!
        const bookmark = await prisma_1.default.bookmark.findFirst({
            where: { userId, questionId },
        });
        if (bookmark) {
            const isAnswerCorrect = selectedAnswer ? selectedAnswer === question.correctAnswer : false;
            const currentInterval = bookmark.revisionCount || 0;
            let nextInterval = 1;
            if (isAnswerCorrect) {
                nextInterval = currentInterval === 0 ? 1 : currentInterval * 2;
                if (nextInterval > 60)
                    nextInterval = 60;
            }
            const nextDate = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000);
            const newCorrect = bookmark.correctCount + (isAnswerCorrect ? 1 : 0);
            const newIncorrect = bookmark.incorrectCount + (isAnswerCorrect ? 0 : 1);
            const newTimes = bookmark.timesPracticed + 1;
            const accuracy = (newCorrect / newTimes) * 100;
            let status = bookmark.status;
            if (newTimes >= 3 && accuracy >= 80) {
                status = "MASTERED";
            }
            else if (isAnswerCorrect) {
                status = "REVIEW";
            }
            else {
                status = "LEARNING";
            }
            await prisma_1.default.bookmark.update({
                where: { id: bookmark.id },
                data: {
                    timesPracticed: newTimes,
                    correctCount: newCorrect,
                    incorrectCount: newIncorrect,
                    revisionCount: nextInterval,
                    nextRevisionDate: nextDate,
                    lastRevisionResult: isAnswerCorrect,
                    lastRevisionAt: new Date(),
                    lastPracticed: new Date(),
                    status,
                },
            });
        }
        res.json({ message: "Answer submitted", isCorrect });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.submitSessionAnswer = submitSessionAnswer;
// 6. Finish Practice Session
const finishSession = async (req, res) => {
    try {
        const userId = req.user.userId;
        const sessionId = req.params.id;
        const session = await prisma_1.default.practiceSession.findFirst({
            where: { id: sessionId, userId },
            include: { questions: true },
        });
        if (!session) {
            return res.status(404).json({ message: "Practice Session not found" });
        }
        const answeredList = session.questions;
        const totalQuestions = session.totalQuestions;
        let correctCount = 0;
        let totalTime = 0;
        answeredList.forEach((q) => {
            if (q.isCorrect === true)
                correctCount++;
            totalTime += q.timeSpent;
        });
        const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
        const score = accuracy; // score is proportional to correct ratio in practice mode
        const updatedSession = await prisma_1.default.practiceSession.update({
            where: { id: sessionId },
            data: {
                completedAt: new Date(),
                score,
                accuracy,
                timeSpent: totalTime,
            },
        });
        // Write practice logs statistics to bookmark practice logs so standard charts load it
        await prisma_1.default.bookmarkPracticeLog.create({
            data: {
                userId,
                questionsCount: totalQuestions,
                correctCount,
                score,
                timeSpent: totalTime,
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Practice Session Completed", sessionId);
        res.json({ message: "Practice finalized successfully", session: updatedSession });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.finishSession = finishSession;
