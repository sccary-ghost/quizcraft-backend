"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignBookmarksToCollection = exports.addCollection = exports.listCollections = exports.getBatchQuestions = exports.submitPracticeLog = exports.submitPracticeAnswer = exports.recommendedBookmarks = exports.getBookmarkStats = exports.resetBookmarkProgress = exports.removeBookmarks = exports.listBookmarks = exports.addBookmark = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
// Helper to calculate Spaced Repetition Next Revision Date
const calculateNextRevision = (currentInterval, isCorrect) => {
    let nextInterval = 1; // default to 1 day if incorrect
    if (isCorrect) {
        // If correct, double the interval (e.g. 1 -> 2 -> 4 -> 8 -> 16)
        nextInterval = currentInterval === 0 ? 1 : currentInterval * 2;
        if (nextInterval > 60)
            nextInterval = 60; // cap at 60 days
    }
    const nextDate = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000);
    return { nextInterval, nextDate };
};
// 1. Add Bookmark
const addBookmark = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questionId, testId } = req.body;
        if (!questionId) {
            return res.status(400).json({ message: "questionId is required" });
        }
        // Ensure system collections exist
        const systemCollections = ["Revision", "Important", "Formula", "Difficult"];
        for (const name of systemCollections) {
            await prisma_1.default.bookmarkCollection.upsert({
                where: { userId_name: { userId, name } },
                update: {},
                create: {
                    userId,
                    name,
                    isSystem: true,
                    color: name === "Difficult" ? "red" : name === "Formula" ? "blue" : "purple",
                },
            });
        }
        // Create or find bookmark
        const bookmark = await prisma_1.default.bookmark.upsert({
            where: { userId_questionId: { userId, questionId } },
            update: {},
            create: {
                userId,
                questionId,
                quizId: testId || null, // Map user-facing testId to internal quizId
                status: "NEW",
                nextRevisionDate: new Date(), // Due immediately
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Question Bookmarked", questionId);
        res.json({ message: "Bookmark saved successfully", bookmark });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.addBookmark = addBookmark;
// 2. List Bookmarks with filters
const listBookmarks = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { collectionId, subject, chapter, topic, difficulty, status, needsRevision, neverPracticed, search, sortBy, } = req.query;
        const whereClause = { userId };
        if (collectionId) {
            whereClause.collections = { some: { id: collectionId } };
        }
        if (subject)
            whereClause.question = { ...whereClause.question, subject: subject };
        if (chapter)
            whereClause.question = { ...whereClause.question, chapter: chapter };
        if (topic)
            whereClause.question = { ...whereClause.question, topic: topic };
        if (difficulty) {
            whereClause.question = { ...whereClause.question, difficulty: difficulty };
        }
        if (status) {
            whereClause.status = status;
        }
        // Spaced repetition filters
        if (needsRevision === "true") {
            whereClause.nextRevisionDate = { lte: new Date() };
        }
        if (neverPracticed === "true") {
            whereClause.timesPracticed = 0;
        }
        // Search by question text
        if (search) {
            whereClause.question = {
                ...whereClause.question,
                question: { contains: search, mode: "insensitive" },
            };
        }
        // Sorting
        let orderBy = { createdAt: "desc" };
        if (sortBy === "last_practiced") {
            orderBy = { lastPracticed: "desc" };
        }
        else if (sortBy === "next_revision") {
            orderBy = { nextRevisionDate: "asc" };
        }
        const bookmarks = await prisma_1.default.bookmark.findMany({
            where: whereClause,
            include: {
                question: true,
                quiz: true,
                collections: true,
            },
            orderBy,
        });
        res.json(bookmarks);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.listBookmarks = listBookmarks;
// 3. Remove/Delete Bookmarks (Single or Bulk)
const removeBookmarks = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { ids } = req.body; // Expects array of bookmark IDs or question IDs
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "An array of IDs is required" });
        }
        await prisma_1.default.bookmark.deleteMany({
            where: {
                userId,
                OR: [
                    { id: { in: ids } },
                    { questionId: { in: ids } },
                ],
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Bookmarks Removed", ids.join(","));
        res.json({ message: "Bookmarks deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.removeBookmarks = removeBookmarks;
// 4. Reset Bookmark Progress
const resetBookmarkProgress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = req.params.id;
        const bookmark = await prisma_1.default.bookmark.findFirst({
            where: { id, userId },
        });
        if (!bookmark) {
            return res.status(404).json({ message: "Bookmark not found" });
        }
        const updated = await prisma_1.default.bookmark.update({
            where: { id },
            data: {
                timesPracticed: 0,
                correctCount: 0,
                incorrectCount: 0,
                revisionCount: 0,
                lastRevisionResult: null,
                lastRevisionAt: null,
                nextRevisionDate: new Date(),
                status: "NEW",
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Bookmark Progress Reset", id);
        res.json({ message: "Bookmark progress reset successfully", bookmark: updated });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.resetBookmarkProgress = resetBookmarkProgress;
// 5. Get Bookmark Statistics
const getBookmarkStats = async (req, res) => {
    try {
        const userId = req.user.userId;
        const bookmarks = await prisma_1.default.bookmark.findMany({
            where: { userId },
        });
        const total = bookmarks.length;
        const solved = bookmarks.filter((b) => b.timesPracticed > 0).length;
        const unsolved = total - solved;
        // Mastered questions (accuracy >= 80% and practiced >= 3 times)
        const mastered = bookmarks.filter((b) => b.status === "MASTERED").length;
        const masteryPercentage = total > 0 ? (mastered / total) * 100 : 0;
        const revisionDue = bookmarks.filter((b) => b.nextRevisionDate && b.nextRevisionDate <= new Date()).length;
        const neverPracticed = unsolved;
        const frequentlyIncorrect = bookmarks.filter((b) => b.incorrectCount > b.correctCount && b.incorrectCount > 0).length;
        // Streaks & average calculations
        const logs = await prisma_1.default.bookmarkPracticeLog.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        const totalSessions = logs.length;
        const totalQuestionsPracticed = bookmarks.reduce((sum, b) => sum + b.timesPracticed, 0);
        const avgPracticeCount = total > 0 ? totalQuestionsPracticed / total : 0;
        // Average solve time
        const avgTime = logs.length > 0 ? logs.reduce((sum, l) => sum + l.timeSpent, 0) / logs.length : 0;
        res.json({
            total,
            solved,
            unsolved,
            mastered,
            masteryPercentage,
            revisionDue,
            frequentlyIncorrect,
            neverPracticed,
            totalSessions,
            avgPracticeCount,
            avgTime,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getBookmarkStats = getBookmarkStats;
// 6. Get Recommended Bookmarks (Spaced Repetitions)
const recommendedBookmarks = async (req, res) => {
    try {
        const userId = req.user.userId;
        const now = new Date();
        const dueRevisions = await prisma_1.default.bookmark.findMany({
            where: {
                userId,
                nextRevisionDate: { lte: now },
            },
            include: { question: true },
            take: 10,
        });
        const neverPracticed = await prisma_1.default.bookmark.findMany({
            where: {
                userId,
                timesPracticed: 0,
            },
            include: { question: true },
            take: 10,
        });
        const frequentlyIncorrect = await prisma_1.default.bookmark.findMany({
            where: {
                userId,
                incorrectCount: { gt: prisma_1.default.bookmark.fields.correctCount },
            },
            include: { question: true },
            take: 10,
        });
        res.json({
            dueRevisions,
            neverPracticed,
            frequentlyIncorrect,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.recommendedBookmarks = recommendedBookmarks;
// 7. Submit Single Practice Question Answer (Spaced Repetition Calculation)
const submitPracticeAnswer = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questionId, isCorrect } = req.body;
        if (!questionId) {
            return res.status(400).json({ message: "questionId is required" });
        }
        const bookmark = await prisma_1.default.bookmark.findFirst({
            where: { userId, questionId },
        });
        if (!bookmark) {
            return res.status(404).json({ message: "Bookmark not found for this candidate" });
        }
        // Spaced repetition interval updates
        const currentInterval = bookmark.revisionCount || 0;
        const { nextInterval, nextDate } = calculateNextRevision(currentInterval, isCorrect);
        // Calculate new status
        const newCorrect = bookmark.correctCount + (isCorrect ? 1 : 0);
        const newIncorrect = bookmark.incorrectCount + (isCorrect ? 0 : 1);
        const newTimes = bookmark.timesPracticed + 1;
        const accuracy = (newCorrect / newTimes) * 100;
        let status = bookmark.status;
        if (newTimes >= 3 && accuracy >= 80) {
            status = "MASTERED";
        }
        else if (isCorrect) {
            status = "REVIEW";
        }
        else {
            status = "LEARNING";
        }
        const updated = await prisma_1.default.bookmark.update({
            where: { id: bookmark.id },
            data: {
                timesPracticed: newTimes,
                correctCount: newCorrect,
                incorrectCount: newIncorrect,
                revisionCount: nextInterval,
                nextRevisionDate: nextDate,
                lastRevisionResult: isCorrect,
                lastRevisionAt: new Date(),
                lastPracticed: new Date(),
                status,
            },
        });
        res.json({ message: "Answer tracked successfully", bookmark: updated });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.submitPracticeAnswer = submitPracticeAnswer;
// 8. Submit Overall Practice Session Log
const submitPracticeLog = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questionsCount, correctCount, score, timeSpent } = req.body;
        const log = await prisma_1.default.bookmarkPracticeLog.create({
            data: {
                userId,
                questionsCount: parseInt(questionsCount) || 0,
                correctCount: parseInt(correctCount) || 0,
                score: parseFloat(score) || 0.0,
                timeSpent: parseInt(timeSpent) || 0,
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Practice Log Submitted", log.id);
        res.json({ message: "Session results saved", log });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.submitPracticeLog = submitPracticeLog;
// 9. Get Questions Batch Details (CBT solver practice mode adapter)
const getBatchQuestions = async (req, res) => {
    try {
        const idsString = req.query.questionIds;
        if (!idsString) {
            return res.status(450).json({ message: "questionIds comma list is required" });
        }
        const ids = idsString.split(",");
        const questions = await prisma_1.default.question.findMany({
            where: { id: { in: ids } },
        });
        res.json({ questions });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getBatchQuestions = getBatchQuestions;
// 10. Manage Collections
const listCollections = async (req, res) => {
    try {
        const userId = req.user.userId;
        const collections = await prisma_1.default.bookmarkCollection.findMany({
            where: { userId },
            orderBy: { sortOrder: "asc" },
        });
        res.json(collections);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.listCollections = listCollections;
const addCollection = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, description, color, icon, sortOrder } = req.body;
        if (!name)
            return res.status(400).json({ message: "name is required" });
        const collection = await prisma_1.default.bookmarkCollection.create({
            data: {
                userId,
                name,
                description,
                color,
                icon,
                sortOrder: parseInt(sortOrder) || 0,
            },
        });
        res.json(collection);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.addCollection = addCollection;
// Bulk Assign bookmarks to collections
const assignBookmarksToCollection = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { bookmarkIds, collectionId, action } = req.body; // action: 'add' | 'remove' | 'move'
        if (!bookmarkIds || !Array.isArray(bookmarkIds) || !collectionId) {
            return res.status(400).json({ message: "bookmarkIds list and collectionId are required" });
        }
        const collection = await prisma_1.default.bookmarkCollection.findFirst({
            where: { id: collectionId, userId },
        });
        if (!collection) {
            return res.status(404).json({ message: "Collection not found" });
        }
        for (const bId of bookmarkIds) {
            if (action === "add" || action === "move") {
                await prisma_1.default.bookmark.update({
                    where: { id: bId, userId },
                    data: {
                        collections: {
                            connect: { id: collectionId },
                        },
                    },
                });
            }
            else if (action === "remove") {
                await prisma_1.default.bookmark.update({
                    where: { id: bId, userId },
                    data: {
                        collections: {
                            disconnect: { id: collectionId },
                        },
                    },
                });
            }
        }
        res.json({ message: "Collections updated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.assignBookmarksToCollection = assignBookmarksToCollection;
