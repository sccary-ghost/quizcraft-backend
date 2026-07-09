"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.endReadingSession = exports.startReadingSession = exports.logReadingHistory = exports.getReadingProgress = exports.updateReadingProgress = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const updateReadingProgress = async (userId, chapterId, data) => {
    return prisma_1.default.readingProgress.upsert({
        where: {
            userId_chapterId: {
                userId,
                chapterId,
            },
        },
        update: {
            ...data,
            lastOpenedAt: new Date(),
        },
        create: {
            userId,
            chapterId,
            ...data,
            lastOpenedAt: new Date(),
        },
    });
};
exports.updateReadingProgress = updateReadingProgress;
const getReadingProgress = async (userId, chapterId) => {
    return prisma_1.default.readingProgress.findUnique({
        where: {
            userId_chapterId: { userId, chapterId },
        },
    });
};
exports.getReadingProgress = getReadingProgress;
const logReadingHistory = async (userId, paragraphId, timeSpentMs) => {
    return prisma_1.default.readingHistory.create({
        data: {
            userId,
            paragraphId,
            timeSpentMs,
        },
    });
};
exports.logReadingHistory = logReadingHistory;
const startReadingSession = async (userId) => {
    return prisma_1.default.readingSession.create({
        data: {
            userId,
            startedAt: new Date(),
        },
    });
};
exports.startReadingSession = startReadingSession;
const endReadingSession = async (sessionId, data) => {
    return prisma_1.default.readingSession.update({
        where: { id: sessionId },
        data: {
            ...data,
            endedAt: new Date(),
        },
    });
};
exports.endReadingSession = endReadingSession;
