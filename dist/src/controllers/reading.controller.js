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
Object.defineProperty(exports, "__esModule", { value: true });
exports.endSession = exports.startSession = exports.logHistory = exports.getProgress = exports.updateProgress = void 0;
const readingAnalyticsService = __importStar(require("../services/readingAnalytics.service"));
const updateProgress = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { chapterId } = req.params;
        const progress = await readingAnalyticsService.updateReadingProgress(userId, chapterId, req.body);
        res.json(progress);
    }
    catch (error) {
        next(error);
    }
};
exports.updateProgress = updateProgress;
const getProgress = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { chapterId } = req.params;
        const progress = await readingAnalyticsService.getReadingProgress(userId, chapterId);
        res.json(progress);
    }
    catch (error) {
        next(error);
    }
};
exports.getProgress = getProgress;
const logHistory = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { paragraphId, timeSpentMs } = req.body;
        const history = await readingAnalyticsService.logReadingHistory(userId, paragraphId, timeSpentMs);
        res.status(201).json(history);
    }
    catch (error) {
        next(error);
    }
};
exports.logHistory = logHistory;
const startSession = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const session = await readingAnalyticsService.startReadingSession(userId);
        res.status(201).json(session);
    }
    catch (error) {
        next(error);
    }
};
exports.startSession = startSession;
const endSession = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const session = await readingAnalyticsService.endReadingSession(sessionId, req.body);
        res.json(session);
    }
    catch (error) {
        next(error);
    }
};
exports.endSession = endSession;
