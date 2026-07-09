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
exports.generateStudyQuiz = exports.generateFlashcards = exports.extractVocab = exports.summarize = exports.translate = exports.simplify = exports.explain = void 0;
const aiReadingService = __importStar(require("../services/aiReading.service"));
const explain = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { text, context } = req.body;
        const response = await aiReadingService.explainText(userId, text, context);
        res.json({ response });
    }
    catch (error) {
        next(error);
    }
};
exports.explain = explain;
const simplify = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { text } = req.body;
        const response = await aiReadingService.simplifyText(userId, text);
        res.json({ response });
    }
    catch (error) {
        next(error);
    }
};
exports.simplify = simplify;
const translate = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { text, targetLanguage } = req.body;
        const response = await aiReadingService.translateText(userId, text, targetLanguage);
        res.json({ response });
    }
    catch (error) {
        next(error);
    }
};
exports.translate = translate;
const summarize = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { text } = req.body;
        const response = await aiReadingService.generateSummary(userId, text);
        res.json({ response });
    }
    catch (error) {
        next(error);
    }
};
exports.summarize = summarize;
const extractVocab = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { text } = req.body;
        const response = await aiReadingService.extractVocabulary(userId, text);
        res.json({ response });
    }
    catch (error) {
        next(error);
    }
};
exports.extractVocab = extractVocab;
const generateFlashcards = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { text } = req.body;
        const response = await aiReadingService.generateFlashcards(userId, text);
        res.json({ response });
    }
    catch (error) {
        next(error);
    }
};
exports.generateFlashcards = generateFlashcards;
const generateStudyQuiz = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { materialId, text, numQuestions } = req.body;
        const draft = await aiReadingService.generateQuizFromStudy(userId, materialId, text, numQuestions);
        res.json(draft);
    }
    catch (error) {
        next(error);
    }
};
exports.generateStudyQuiz = generateStudyQuiz;
