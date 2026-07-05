"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActive = exports.claim = exports.syncState = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const sessionSync_service_1 = require("../services/sessionSync.service");
const syncState = async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = req.params.id;
        const { type, version, clientId, currentIndex, currentSectionId, markedForReview, visitedQuestions, warningCount, answers } = req.body;
        if (!type || !clientId || version === undefined) {
            return res.status(400).json({ message: "type, clientId, and version parameters are required" });
        }
        const result = await (0, sessionSync_service_1.syncSession)(userId, id, type, {
            version: parseInt(version) || 0,
            clientId,
            currentIndex: parseInt(currentIndex) || 0,
            currentSectionId,
            markedForReview: markedForReview || [],
            visitedQuestions: visitedQuestions || [],
            warningCount: parseInt(warningCount) || 0,
            answers: answers || [],
        }, req);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.syncState = syncState;
const claim = async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = req.params.id;
        const { type, clientId } = req.body;
        if (!type || !clientId) {
            return res.status(400).json({ message: "type and clientId parameters are required" });
        }
        const claimed = await (0, sessionSync_service_1.claimSession)(userId, id, type, clientId, req);
        if (!claimed) {
            return res.status(404).json({ message: "Active snapshot session not found" });
        }
        res.json({ message: "Session claimed successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.claim = claim;
// Check for active test or practice to prompt resume overlay widget
const getActive = async (req, res) => {
    try {
        const userId = req.user.userId;
        const activeAttempt = await prisma_1.default.attempt.findFirst({
            where: {
                userId,
                state: { notIn: ["COMPLETED", "AUTO_SUBMITTED", "EXPIRED"] },
            },
            include: {
                quiz: true,
                session: true,
            },
            orderBy: { submittedAt: "desc" },
        });
        const activePractice = await prisma_1.default.practiceSession.findFirst({
            where: {
                userId,
                completedAt: null,
            },
            include: {
                snapshot: true,
            },
            orderBy: { createdAt: "desc" },
        });
        res.json({
            attempt: activeAttempt,
            practice: activePractice,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getActive = getActive;
