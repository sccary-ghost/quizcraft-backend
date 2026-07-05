"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimSession = exports.syncSession = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const auditLogger_1 = require("../utils/auditLogger");
const syncSession = async (userId, sessionId, type, payload, req // for audit logger usage
) => {
    const now = new Date();
    if (type === "attempt") {
        // 1. Load Attempt
        const attempt = await prisma_1.default.attempt.findFirst({
            where: { id: sessionId, userId },
            include: { quiz: true, session: true },
        });
        if (!attempt) {
            return { status: "NOT_FOUND", message: "Attempt not found" };
        }
        if (attempt.state === "COMPLETED" || attempt.state === "AUTO_SUBMITTED") {
            return { status: "TERMINATED", message: "Test already submitted." };
        }
        // Initialize snapshot if not present
        let snapshot = attempt.session;
        if (!snapshot) {
            // Build default question/option orders to preserve layouts across refreshes
            const questionsList = await prisma_1.default.question.findMany({
                where: { quizId: attempt.quizId },
                select: { id: true, optionA: true, optionB: true, optionC: true, optionD: true },
            });
            const questionOrder = questionsList.map((q) => q.id);
            const optionOrder = {};
            questionsList.forEach((q) => {
                optionOrder[q.id] = [q.optionA, q.optionB, q.optionC, q.optionD];
            });
            snapshot = await prisma_1.default.attemptSession.create({
                data: {
                    attemptId: sessionId,
                    questionOrder,
                    optionOrder,
                    markedForReview: [],
                    visitedQuestions: [],
                },
                include: { attempt: { include: { quiz: true } } },
            });
        }
        // A. Version checks
        if (payload.version <= snapshot.version) {
            return { status: "SYNC_CONFLICT", dbVersion: snapshot.version };
        }
        // B. Heartbeat lockout verification (30 seconds window)
        if (snapshot.clientId &&
            snapshot.clientId !== payload.clientId &&
            snapshot.lastHeartbeatAt &&
            now.getTime() - snapshot.lastHeartbeatAt.getTime() < 30000) {
            // Audit log duplicate lockout warning
            await prisma_1.default.sessionHistoryLog.create({
                data: {
                    attemptId: sessionId,
                    event: client_1.SessionEvent.HEARTBEAT,
                    payload: { conflictClientId: payload.clientId, currentClientId: snapshot.clientId },
                },
            });
            return { status: "LOCKED", message: "This session is active on another device/tab." };
        }
        // C. Server Authority calculations
        const elapsedSeconds = Math.floor((now.getTime() - attempt.submittedAt.getTime()) / 1000);
        const durationSeconds = attempt.quiz.duration * 60;
        const timeLeft = Math.max(0, durationSeconds - elapsedSeconds);
        if (timeLeft <= 0) {
            // Auto submit test
            await prisma_1.default.attempt.update({
                where: { id: sessionId },
                data: { state: client_1.SessionState.AUTO_SUBMITTED },
            });
            return { status: "EXPIRED", message: "Test timer expired." };
        }
        // Authoritative warning cap validation
        const verifiedWarnings = Math.max(snapshot.warningCount, payload.warningCount);
        // Apply incremental answer updates
        for (const ans of payload.answers) {
            const dbQuestion = await prisma_1.default.question.findUnique({ where: { id: ans.questionId } });
            const isCorrect = ans.selectedAnswer && dbQuestion ? ans.selectedAnswer.trim() === dbQuestion.correctAnswer.trim() : false;
            await prisma_1.default.answer.upsert({
                where: { id: `${sessionId}_${ans.questionId}` }, // unique format fallback or dynamic find
                update: {
                    selectedAnswer: ans.selectedAnswer,
                    isCorrect,
                    timeSpent: ans.timeSpent,
                },
                create: {
                    id: `${sessionId}_${ans.questionId}`,
                    attemptId: sessionId,
                    questionId: ans.questionId,
                    selectedAnswer: ans.selectedAnswer,
                    isCorrect,
                    timeSpent: ans.timeSpent,
                },
            });
        }
        // D. Update state snapshot
        await prisma_1.default.attemptSession.update({
            where: { id: snapshot.id },
            data: {
                currentIndex: payload.currentIndex,
                currentSectionId: payload.currentSectionId,
                markedForReview: payload.markedForReview,
                visitedQuestions: payload.visitedQuestions,
                warningCount: verifiedWarnings,
                version: payload.version,
                clientId: payload.clientId,
                lastHeartbeatAt: now,
            },
        });
        await prisma_1.default.sessionHistoryLog.create({
            data: {
                attemptId: sessionId,
                event: client_1.SessionEvent.AUTO_SAVE,
                payload: { version: payload.version },
            },
        });
        return { status: "SUCCESS", version: payload.version, timeLeft };
    }
    else {
        // 2. Load Practice Session
        const practice = await prisma_1.default.practiceSession.findFirst({
            where: { id: sessionId, userId },
            include: { snapshot: true },
        });
        if (!practice) {
            return { status: "NOT_FOUND", message: "Practice Session not found" };
        }
        if (practice.completedAt) {
            return { status: "TERMINATED", message: "Practice already finished." };
        }
        // Initialize snapshot if not present
        let snapshot = practice.snapshot;
        if (!snapshot) {
            // Build layouts
            const questionsList = await prisma_1.default.practiceSessionQuestion.findMany({
                where: { practiceSessionId: sessionId },
                include: { question: true },
            });
            const questionOrder = questionsList.map((q) => q.questionId);
            const optionOrder = {};
            questionsList.forEach((qLink) => {
                const q = qLink.question;
                optionOrder[q.id] = [q.optionA, q.optionB, q.optionC, q.optionD];
            });
            snapshot = await prisma_1.default.practiceSessionSnapshot.create({
                data: {
                    practiceId: sessionId,
                    questionOrder,
                    optionOrder,
                    markedForReview: [],
                    visitedQuestions: [],
                },
            });
        }
        // A. Version check
        if (payload.version <= snapshot.version) {
            return { status: "SYNC_CONFLICT", dbVersion: snapshot.version };
        }
        // B. Heartbeat lockout
        if (snapshot.clientId &&
            snapshot.clientId !== payload.clientId &&
            snapshot.lastHeartbeatAt &&
            now.getTime() - snapshot.lastHeartbeatAt.getTime() < 30000) {
            return { status: "LOCKED", message: "Practice session is open in another tab." };
        }
        // C. Server authorities
        const start = practice.startedAt || practice.createdAt;
        const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
        const durationSeconds = practice.totalQuestions * 2 * 60; // 2 min/question
        const timeLeft = Math.max(0, durationSeconds - elapsedSeconds);
        const verifiedWarnings = Math.max(snapshot.warningCount, payload.warningCount);
        // Apply answer operations
        for (const ans of payload.answers) {
            const dbQuestion = await prisma_1.default.question.findUnique({ where: { id: ans.questionId } });
            const isCorrect = ans.selectedAnswer && dbQuestion ? ans.selectedAnswer.trim() === dbQuestion.correctAnswer.trim() : false;
            await prisma_1.default.practiceSessionQuestion.upsert({
                where: {
                    practiceSessionId_questionId: {
                        practiceSessionId: sessionId,
                        questionId: ans.questionId,
                    },
                },
                update: {
                    selectedAnswer: ans.selectedAnswer,
                    isCorrect,
                    timeSpent: ans.timeSpent,
                },
                create: {
                    practiceSessionId: sessionId,
                    questionId: ans.questionId,
                    selectedAnswer: ans.selectedAnswer,
                    isCorrect,
                    timeSpent: ans.timeSpent,
                },
            });
        }
        // D. Update snapshot
        await prisma_1.default.practiceSessionSnapshot.update({
            where: { id: snapshot.id },
            data: {
                currentIndex: payload.currentIndex,
                currentSectionId: payload.currentSectionId,
                markedForReview: payload.markedForReview,
                visitedQuestions: payload.visitedQuestions,
                warningCount: verifiedWarnings,
                version: payload.version,
                clientId: payload.clientId,
                lastHeartbeatAt: now,
            },
        });
        await prisma_1.default.sessionHistoryLog.create({
            data: {
                practiceId: sessionId,
                event: client_1.SessionEvent.AUTO_SAVE,
                payload: { version: payload.version },
            },
        });
        return { status: "SUCCESS", version: payload.version, timeLeft };
    }
};
exports.syncSession = syncSession;
// Claim Ownership
const claimSession = async (userId, sessionId, type, clientId, req) => {
    const now = new Date();
    if (type === "attempt") {
        const attempt = await prisma_1.default.attempt.findFirst({
            where: { id: sessionId, userId },
            include: { session: true },
        });
        if (!attempt || !attempt.session)
            return false;
        await prisma_1.default.attemptSession.update({
            where: { id: attempt.session.id },
            data: {
                clientId,
                lastHeartbeatAt: now,
            },
        });
        await prisma_1.default.sessionHistoryLog.create({
            data: {
                attemptId: sessionId,
                event: client_1.SessionEvent.CLAIMED,
                payload: { clientId },
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Test Session Claimed", sessionId);
        return true;
    }
    else {
        const practice = await prisma_1.default.practiceSession.findFirst({
            where: { id: sessionId, userId },
            include: { snapshot: true },
        });
        if (!practice || !practice.snapshot)
            return false;
        await prisma_1.default.practiceSessionSnapshot.update({
            where: { id: practice.snapshot.id },
            data: {
                clientId,
                lastHeartbeatAt: now,
            },
        });
        await prisma_1.default.sessionHistoryLog.create({
            data: {
                practiceId: sessionId,
                event: client_1.SessionEvent.CLAIMED,
                payload: { clientId },
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Practice Session Claimed", sessionId);
        return true;
    }
};
exports.claimSession = claimSession;
