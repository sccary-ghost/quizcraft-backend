"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuizFromStudy = exports.generateFlashcards = exports.extractVocabulary = exports.generateSummary = exports.translateText = exports.simplifyText = exports.explainText = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const ai_service_1 = require("./ai.service");
const getCacheHash = (purpose, prompt) => {
    return crypto_1.default.createHash("sha256").update(`${purpose}:${prompt}`).digest("hex");
};
const getCachedResponse = async (requestHash) => {
    const cached = await prisma_1.default.aICache.findUnique({ where: { requestHash } });
    if (cached && (!cached.expiresAt || cached.expiresAt > new Date())) {
        return cached.response;
    }
    return null;
};
const setCachedResponse = async (requestHash, prompt, response, provider) => {
    await prisma_1.default.aICache.upsert({
        where: { requestHash },
        update: { response, provider, createdAt: new Date() },
        create: { requestHash, prompt, response, provider },
    });
};
const callCachedLLM = async (purpose, prompt, userId) => {
    const requestHash = getCacheHash(purpose, prompt);
    const cachedResponse = await getCachedResponse(requestHash);
    if (cachedResponse) {
        return cachedResponse;
    }
    const result = await (0, ai_service_1.callLLM)(purpose, prompt, userId);
    await (0, ai_service_1.logRequest)(userId, purpose, prompt, result, client_1.AIRequestStatus.SUCCESS);
    await setCachedResponse(requestHash, prompt, result.response, result.provider);
    return result.response;
};
const explainText = async (userId, text, context) => {
    const prompt = `Explain the following text clearly.\nContext: ${context || "None"}\nText: ${text}`;
    return callCachedLLM(client_1.AIPromptPurpose.CONTEXTUAL_EXPLANATION, prompt, userId);
};
exports.explainText = explainText;
const simplifyText = async (userId, text) => {
    const prompt = `Simplify the following text so that it's easy to understand for a beginner:\n${text}`;
    return callCachedLLM(client_1.AIPromptPurpose.SIMPLIFY_TEXT, prompt, userId);
};
exports.simplifyText = simplifyText;
const translateText = async (userId, text, targetLanguage) => {
    const prompt = `Translate the following text into ${targetLanguage}:\n${text}`;
    return callCachedLLM(client_1.AIPromptPurpose.TRANSLATION, prompt, userId);
};
exports.translateText = translateText;
const generateSummary = async (userId, text) => {
    const prompt = `Provide a concise summary of the following text:\n${text}`;
    return callCachedLLM(client_1.AIPromptPurpose.STUDY_SUMMARY, prompt, userId);
};
exports.generateSummary = generateSummary;
const extractVocabulary = async (userId, text) => {
    const prompt = `Extract difficult or important vocabulary words from this text and provide their meanings in JSON format like [{ "word": "...", "meaning": "...", "partOfSpeech": "..." }]:\n${text}`;
    const response = await callCachedLLM(client_1.AIPromptPurpose.VOCABULARY_EXTRACTION, prompt, userId);
    try {
        return JSON.parse(response.replace(/```json|```/g, "").trim());
    }
    catch {
        return { raw: response };
    }
};
exports.extractVocabulary = extractVocabulary;
const generateFlashcards = async (userId, text) => {
    const prompt = `Generate 5 flashcards from the following text. Return in JSON array format like [{ "front": "...", "back": "..." }]:\n${text}`;
    const response = await callCachedLLM(client_1.AIPromptPurpose.FLASHCARD_GENERATION, prompt, userId);
    try {
        return JSON.parse(response.replace(/```json|```/g, "").trim());
    }
    catch {
        return { raw: response };
    }
};
exports.generateFlashcards = generateFlashcards;
const generateQuizFromStudy = async (userId, materialId, text, numQuestions = 5) => {
    const prompt = `Generate ${numQuestions} multiple choice questions from this text. Return JSON array: [{ "question": "...", "options": ["A", "B", "C", "D"], "answer": "...", "explanation": "..." }]\nText: ${text}`;
    const response = await callCachedLLM(client_1.AIPromptPurpose.QUIZ_GENERATION, prompt, userId);
    let generatedData;
    try {
        generatedData = JSON.parse(response.replace(/```json|```/g, "").trim());
    }
    catch {
        generatedData = { raw: response };
    }
    // Save to AIGeneratedStudyDraft first as per requirement
    const draft = await prisma_1.default.aIGeneratedStudyDraft.create({
        data: {
            userId,
            materialId,
            sourceText: text,
            generatedData,
            status: "PENDING"
        }
    });
    return draft;
};
exports.generateQuizFromStudy = generateQuizFromStudy;
