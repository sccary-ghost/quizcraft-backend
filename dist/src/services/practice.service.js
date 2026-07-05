"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendations = exports.getPracticeStats = exports.generatePracticeSession = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
// 1. Generate Practice Session
const generatePracticeSession = async (userId, source, filters = {}, adaptive = {}, options = {}) => {
    const limit = filters.limit || 20;
    let candidateQuestionIds;
    // Step A: Aggregate candidates based on Source
    if (source === client_1.PracticeSource.BOOKMARKS) {
        const bookmarks = await prisma_1.default.bookmark.findMany({
            where: { userId },
            select: { questionId: true },
        });
        candidateQuestionIds = bookmarks.map((b) => b.questionId);
    }
    else if (source === client_1.PracticeSource.INCORRECT) {
        const incorrectAnswers = await prisma_1.default.answer.findMany({
            where: {
                attempt: { userId },
                isCorrect: false,
                selectedAnswer: { not: null },
            },
            select: { questionId: true },
        });
        candidateQuestionIds = Array.from(new Set(incorrectAnswers.map((a) => a.questionId)));
    }
    else if (source === client_1.PracticeSource.SKIPPED) {
        const skippedAnswers = await prisma_1.default.answer.findMany({
            where: {
                attempt: { userId },
                selectedAnswer: null,
            },
            select: { questionId: true },
        });
        candidateQuestionIds = Array.from(new Set(skippedAnswers.map((a) => a.questionId)));
    }
    else if (source === client_1.PracticeSource.WEAK_SUBJECTS ||
        source === client_1.PracticeSource.WEAK_CHAPTERS ||
        source === client_1.PracticeSource.WEAK_TOPICS) {
        // Determine weak areas (accuracy < 70%)
        const allAnswers = await prisma_1.default.answer.findMany({
            where: { attempt: { userId } },
            include: { question: true },
        });
        const groupStats = {};
        allAnswers.forEach((ans) => {
            let key;
            if (source === client_1.PracticeSource.WEAK_SUBJECTS)
                key = ans.question.subject || "General";
            else if (source === client_1.PracticeSource.WEAK_CHAPTERS)
                key = ans.question.chapter || "Uncategorized";
            else
                key = ans.question.topic || "Miscellaneous";
            if (!groupStats[key])
                groupStats[key] = { total: 0, correct: 0 };
            groupStats[key].total++;
            if (ans.isCorrect)
                groupStats[key].correct++;
        });
        const weakKeys = Object.keys(groupStats).filter((key) => {
            const accuracy = (groupStats[key].correct / groupStats[key].total) * 100;
            return accuracy < 70.0;
        });
        // Fetch questions from bank belonging to weak entities
        const weakQuestions = await prisma_1.default.question.findMany({
            where: {
                isBank: true,
                isDeleted: false,
                OR: [
                    source === client_1.PracticeSource.WEAK_SUBJECTS ? { subject: { in: weakKeys } } : {},
                    source === client_1.PracticeSource.WEAK_CHAPTERS ? { chapter: { in: weakKeys } } : {},
                    source === client_1.PracticeSource.WEAK_TOPICS ? { topic: { in: weakKeys } } : {},
                ],
            },
            select: { id: true },
        });
        candidateQuestionIds = weakQuestions.map((q) => q.id);
    }
    else if (source === client_1.PracticeSource.MIXED) {
        // Combine bookmarks, incorrects, skipped
        const [bookmarks, incorrects, skipped] = await Promise.all([
            prisma_1.default.bookmark.findMany({ where: { userId }, select: { questionId: true } }),
            prisma_1.default.answer.findMany({ where: { attempt: { userId }, isCorrect: false }, select: { questionId: true } }),
            prisma_1.default.answer.findMany({ where: { attempt: { userId }, selectedAnswer: null }, select: { questionId: true } }),
        ]);
        const combined = new Set();
        bookmarks.forEach((b) => combined.add(b.questionId));
        incorrects.forEach((a) => combined.add(a.questionId));
        skipped.forEach((a) => combined.add(a.questionId));
        candidateQuestionIds = Array.from(combined);
    }
    else {
        // CUSTOM/General Bank Questions
        const questions = await prisma_1.default.question.findMany({
            where: { isBank: true, isDeleted: false },
            select: { id: true },
        });
        candidateQuestionIds = questions.map((q) => q.id);
    }
    // Step B: Load candidate questions database details with basic filters
    const whereFilters = {
        id: { in: candidateQuestionIds },
        isDeleted: false,
    };
    if (filters.subject)
        whereFilters.subject = filters.subject;
    if (filters.chapter)
        whereFilters.chapter = filters.chapter;
    if (filters.topic)
        whereFilters.topic = filters.topic;
    if (filters.quizId)
        whereFilters.quizId = filters.quizId;
    const initialQuestions = await prisma_1.default.question.findMany({
        where: whereFilters,
    });
    // Step C: Apply Adaptive filtering based on student histories
    const allHistoricalAnswers = await prisma_1.default.answer.findMany({
        where: {
            attempt: { userId },
            questionId: { in: initialQuestions.map((q) => q.id) },
        },
        orderBy: { attempt: { submittedAt: "asc" } },
    });
    // Map histories per question
    const questionHistoryMap = {};
    allHistoricalAnswers.forEach((ans) => {
        if (!questionHistoryMap[ans.questionId]) {
            questionHistoryMap[ans.questionId] = {
                total: 0,
                correct: 0,
                incorrect: 0,
                skipped: 0,
                lastIsCorrect: null,
            };
        }
        const qh = questionHistoryMap[ans.questionId];
        qh.total++;
        if (ans.selectedAnswer === null) {
            qh.skipped++;
            qh.lastIsCorrect = null;
        }
        else if (ans.isCorrect) {
            qh.correct++;
            qh.lastIsCorrect = true;
        }
        else {
            qh.incorrect++;
            qh.lastIsCorrect = false;
        }
    });
    const filtered = initialQuestions.filter((q) => {
        const qh = questionHistoryMap[q.id];
        // Adaptive checks
        if (adaptive.neverCorrect) {
            if (!qh || qh.correct > 0)
                return false;
        }
        if (adaptive.incorrectLastAttempt) {
            if (!qh || qh.lastIsCorrect !== false)
                return false;
        }
        if (adaptive.incorrectMultiple) {
            if (!qh || qh.incorrect <= 1)
                return false;
        }
        if (adaptive.frequentlySkipped) {
            if (!qh || qh.skipped <= 1)
                return false;
        }
        return true;
    });
    // Step D: Adaptive Difficulty expansion if remaining questions count is below target threshold
    const targetDiff = filters.difficulty || client_1.Difficulty.MEDIUM;
    let finalQuestions = filtered.filter((q) => q.difficulty === targetDiff);
    if (finalQuestions.length < limit) {
        // Fallback order: If Target is HARD -> include MEDIUM -> include EASY
        // If Target is MEDIUM -> include HARD -> include EASY
        // If Target is EASY -> include MEDIUM -> include HARD
        const fallbacks = targetDiff === client_1.Difficulty.HARD
            ? [client_1.Difficulty.MEDIUM, client_1.Difficulty.EASY]
            : targetDiff === client_1.Difficulty.MEDIUM
                ? [client_1.Difficulty.HARD, client_1.Difficulty.EASY]
                : [client_1.Difficulty.MEDIUM, client_1.Difficulty.HARD];
        for (const fb of fallbacks) {
            if (finalQuestions.length >= limit)
                break;
            const additional = filtered.filter((q) => q.difficulty === fb);
            finalQuestions = [...finalQuestions, ...additional].slice(0, limit);
        }
    }
    // Shuffle questions if requested
    if (options.shuffleQuestions) {
        finalQuestions = finalQuestions.sort(() => Math.random() - 0.5);
    }
    // Limit questions to target size
    finalQuestions = finalQuestions.slice(0, limit);
    // Step E: Persist PracticeSession and PracticeSessionQuestions
    const session = await prisma_1.default.practiceSession.create({
        data: {
            userId,
            source,
            filters: filters,
            adaptive: adaptive,
            options: options,
            totalQuestions: finalQuestions.length,
            startedAt: new Date(),
        },
    });
    // Create links
    const questionRelations = finalQuestions.map((q, idx) => ({
        practiceSessionId: session.id,
        questionId: q.id,
        order: idx,
    }));
    await prisma_1.default.practiceSessionQuestion.createMany({
        data: questionRelations,
    });
    const sessionWithQuestions = await prisma_1.default.practiceSession.findUnique({
        where: { id: session.id },
        include: {
            questions: {
                include: { question: true },
                orderBy: { order: "asc" },
            },
        },
    });
    return sessionWithQuestions;
};
exports.generatePracticeSession = generatePracticeSession;
// 2. Calculate Practice Center Stats for user
const getPracticeStats = async (userId) => {
    const sessions = await prisma_1.default.practiceSession.findMany({
        where: { userId, completedAt: { not: null } },
        include: { questions: true },
        orderBy: { completedAt: "desc" },
    });
    const sourcesList = [
        client_1.PracticeSource.BOOKMARKS,
        client_1.PracticeSource.INCORRECT,
        client_1.PracticeSource.SKIPPED,
        client_1.PracticeSource.WEAK_SUBJECTS,
        client_1.PracticeSource.MIXED,
    ];
    const stats = {};
    for (const src of sourcesList) {
        const srcSessions = sessions.filter((s) => s.source === src);
        const total = srcSessions.length;
        if (total === 0) {
            stats[src] = {
                totalSessions: 0,
                avgAccuracy: 0,
                avgTime: 0,
                improvement: 0,
            };
            continue;
        }
        const avgAccuracy = srcSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / total;
        const avgTime = srcSessions.reduce((sum, s) => sum + s.timeSpent, 0) / total;
        // Improvement since last session
        let improvement = 0;
        if (total > 1) {
            const lastSessionAccuracy = srcSessions[0].accuracy || 0;
            const previousSessions = srcSessions.slice(1);
            const prevAverage = previousSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / previousSessions.length;
            improvement = lastSessionAccuracy - prevAverage;
        }
        stats[src] = {
            totalSessions: total,
            avgAccuracy: Math.round(avgAccuracy),
            avgTime: Math.round(avgTime),
            improvement: Math.round(improvement),
        };
    }
    return stats;
};
exports.getPracticeStats = getPracticeStats;
// 3. Recommended workout generator
const getRecommendations = async (userId) => {
    // A. Check for due bookmarks
    const dueBookmarks = await prisma_1.default.bookmark.count({
        where: {
            userId,
            nextRevisionDate: { lte: new Date() },
        },
    });
    if (dueBookmarks > 0) {
        return {
            reason: `You have ${dueBookmarks} bookmarked questions due for spaced revision.`,
            source: client_1.PracticeSource.BOOKMARKS,
            filters: { limit: 15 },
            adaptive: {},
        };
    }
    // B. Analyze weak subject
    const allAnswers = await prisma_1.default.answer.findMany({
        where: { attempt: { userId } },
        include: { question: true },
    });
    const subjectStats = {};
    allAnswers.forEach((ans) => {
        const sub = ans.question.subject || "General";
        if (!subjectStats[sub])
            subjectStats[sub] = { total: 0, correct: 0 };
        subjectStats[sub].total++;
        if (ans.isCorrect)
            subjectStats[sub].correct++;
    });
    let weakestSubject = "";
    let lowestAccuracy = 100;
    Object.keys(subjectStats).forEach((sub) => {
        const accuracy = (subjectStats[sub].correct / subjectStats[sub].total) * 100;
        if (accuracy < lowestAccuracy && subjectStats[sub].total >= 5) {
            lowestAccuracy = accuracy;
            weakestSubject = sub;
        }
    });
    if (weakestSubject && lowestAccuracy < 70) {
        return {
            reason: `Your accuracy in "${weakestSubject}" is currently ${Math.round(lowestAccuracy)}%. Target practice recommended.`,
            source: client_1.PracticeSource.WEAK_SUBJECTS,
            filters: { subject: weakestSubject, limit: 15 },
            adaptive: {},
        };
    }
    // C. Fallback to general incorrect
    const incorrectCount = await prisma_1.default.answer.count({
        where: { attempt: { userId }, isCorrect: false },
    });
    if (incorrectCount > 0) {
        return {
            reason: `Review your ${incorrectCount} historical test mistakes to secure memory retention.`,
            source: client_1.PracticeSource.INCORRECT,
            filters: { limit: 20 },
            adaptive: { incorrectLastAttempt: true },
        };
    }
    // D. General mixed workout fallback
    return {
        reason: "A balanced mixed revision session is recommended to maintain baseline accuracy scores.",
        source: client_1.PracticeSource.MIXED,
        filters: { limit: 20 },
        adaptive: {},
    };
};
exports.getRecommendations = getRecommendations;
