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
exports.reject = exports.importToBank = exports.approve = exports.history = exports.improve = exports.similar = exports.bloom = exports.difficulty = exports.grammarFix = exports.ocrClean = exports.duplicateCheck = exports.distractors = exports.translate = exports.explain = exports.generate = void 0;
const AIService = __importStar(require("../services/ai.service"));
const generate = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { topic, difficulty, subject, language } = req.body;
        if (!topic)
            return res.status(400).json({ message: "topic is required" });
        const result = await AIService.generateQuestion(userId, topic, difficulty || "Medium", subject || "General", language);
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.generate = generate;
const explain = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questionText } = req.body;
        if (!questionText)
            return res.status(400).json({ message: "questionText is required" });
        const result = await AIService.generateExplanation(userId, questionText);
        res.json({ explanation: result });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.explain = explain;
const translate = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { text } = req.body;
        if (!text)
            return res.status(400).json({ message: "text is required" });
        const result = await AIService.translateToHindi(userId, text);
        res.json({ translation: result });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.translate = translate;
const distractors = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { question, correctAnswer } = req.body;
        if (!question || !correctAnswer)
            return res.status(400).json({ message: "question and correctAnswer are required" });
        const result = await AIService.generateDistractors(userId, question, correctAnswer);
        res.json({ distractors: result });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.distractors = distractors;
const duplicateCheck = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questionText } = req.body;
        if (!questionText)
            return res.status(400).json({ message: "questionText is required" });
        const result = await AIService.checkDuplicate(userId, questionText);
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.duplicateCheck = duplicateCheck;
const ocrClean = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { rawText } = req.body;
        if (!rawText)
            return res.status(400).json({ message: "rawText is required" });
        const result = await AIService.cleanOCR(userId, rawText);
        res.json({ cleaned: result });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.ocrClean = ocrClean;
const grammarFix = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { text } = req.body;
        if (!text)
            return res.status(400).json({ message: "text is required" });
        const result = await AIService.fixGrammar(userId, text);
        res.json({ corrected: result });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.grammarFix = grammarFix;
const difficulty = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questionText } = req.body;
        if (!questionText)
            return res.status(400).json({ message: "questionText is required" });
        const result = await AIService.estimateDifficulty(userId, questionText);
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.difficulty = difficulty;
const bloom = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questionText } = req.body;
        if (!questionText)
            return res.status(400).json({ message: "questionText is required" });
        const result = await AIService.classifyBloom(userId, questionText);
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.bloom = bloom;
const similar = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questionText } = req.body;
        if (!questionText)
            return res.status(400).json({ message: "questionText is required" });
        const result = await AIService.generateSimilarQuestion(userId, questionText);
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.similar = similar;
const improve = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questionText } = req.body;
        if (!questionText)
            return res.status(400).json({ message: "questionText is required" });
        const result = await AIService.suggestImprovements(userId, questionText);
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.improve = improve;
const history = async (req, res) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const result = await AIService.getHistory(userId, role);
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.history = history;
const approve = async (req, res) => {
    try {
        const result = await AIService.approveQuestion(req.params.id);
        res.json({ message: "Approved", result });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.approve = approve;
const importToBank = async (req, res) => {
    try {
        const result = await AIService.importQuestion(req.params.id);
        res.json({ message: "Imported to Question Bank", question: result });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.importToBank = importToBank;
const reject = async (req, res) => {
    try {
        await AIService.rejectQuestion(req.params.id);
        res.json({ message: "Rejected and deleted" });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.reject = reject;
