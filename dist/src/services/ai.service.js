"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectQuestion = exports.importQuestion = exports.approveQuestion = exports.getHistory = exports.suggestImprovements = exports.generateSimilarQuestion = exports.classifyBloom = exports.estimateDifficulty = exports.fixGrammar = exports.cleanOCR = exports.checkDuplicate = exports.generateDistractors = exports.translateToHindi = exports.generateExplanation = exports.generateQuestion = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
// ─── Provider-agnostic LLM caller ────────────────────────────────────────────
async function callLLM(purpose, userContent, userId) {
    // Load active provider config
    const providerConfig = await prisma_1.default.aIProviderConfig.findFirst({
        where: { enabled: true },
        orderBy: { updatedAt: "desc" },
    });
    const provider = providerConfig?.provider ?? client_1.AIProvider.GEMINI;
    const apiKey = providerConfig?.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
    const modelName = providerConfig?.modelName ?? "gemini-2.0-flash";
    const temperature = providerConfig?.temperature ?? 0.7;
    const maxTokens = providerConfig?.maxTokens ?? 2048;
    // Load prompt template
    const template = await prisma_1.default.aIPromptTemplate.findFirst({
        where: { purpose, enabled: true },
    });
    const systemPrompt = template?.prompt ?? getDefaultPrompt(purpose);
    const fullPrompt = `${systemPrompt}\n\nUser Input:\n${userContent}`;
    const startTime = Date.now();
    let response = "";
    let tokenUsage = 0;
    try {
        if (provider === client_1.AIProvider.GEMINI) {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    generationConfig: { temperature, maxOutputTokens: maxTokens },
                }),
            });
            const data = await res.json();
            response = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            tokenUsage = data?.usageMetadata?.totalTokenCount ?? 0;
        }
        else if (provider === client_1.AIProvider.OPENAI) {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [{ role: "user", content: fullPrompt }],
                    temperature,
                    max_tokens: maxTokens,
                }),
            });
            const data = await res.json();
            response = data?.choices?.[0]?.message?.content ?? "";
            tokenUsage = data?.usage?.total_tokens ?? 0;
        }
        else if (provider === client_1.AIProvider.OLLAMA) {
            const endpoint = providerConfig?.endpoint ?? "http://localhost:11434";
            const res = await fetch(`${endpoint}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: modelName, prompt: fullPrompt, stream: false }),
            });
            const data = await res.json();
            response = data?.response ?? "";
        }
    }
    catch (err) {
        throw new Error(`LLM call failed: ${err.message}`);
    }
    const executionTime = Date.now() - startTime;
    return { response, provider, tokenUsage, executionTime };
}
// ─── Default system prompts (fallback if no template saved) ──────────────────
function getDefaultPrompt(purpose) {
    const prompts = {
        QUESTION_GENERATION: `You are an expert exam question writer for government competitive exams (SSC, UPSC, Railway).
Generate a multiple-choice question with exactly 4 options (A, B, C, D), one correct answer, and a short explanation.
Respond in strict JSON format:
{
  "question": "...",
  "optionA": "...",
  "optionB": "...",
  "optionC": "...",
  "optionD": "...",
  "answer": "...",
  "explanation": "..."
}`,
        EXPLANATION: `You are an expert tutor. Given a question and correct answer, write a clear concise explanation (2-4 sentences) suitable for exam students. Return only the explanation text.`,
        TRANSLATION: `You are a professional Hindi translator specializing in educational content. Translate the given English exam text to Hindi accurately. Preserve technical terms in brackets if needed. Return only the Hindi translation.`,
        DISTRACTOR_GENERATION: `You are an expert at creating plausible but incorrect answer options (distractors) for multiple-choice questions. Given a question and correct answer, generate 3 convincing wrong options. Return as JSON array: ["distractor1", "distractor2", "distractor3"]`,
        DUPLICATE_CHECK: `You are a duplicate detection expert. Given a question, analyze whether it is semantically similar to the provided list. Return JSON: { "isDuplicate": true/false, "similarity": 0.0-1.0, "reason": "..." }`,
        OCR_CLEANUP: `You are an OCR text correction expert. Clean up the following OCR-extracted text from a question paper. Fix spelling errors, formatting issues, and garbled characters. Return only the cleaned text.`,
        GRAMMAR_FIX: `You are an English grammar expert. Fix grammar, spelling, and clarity issues in the following exam question text. Return only the corrected text.`,
        DIFFICULTY_ESTIMATION: `You are an expert psychometrician. Analyze the cognitive complexity of this exam question and classify it as Easy, Medium, or Hard. Return JSON: { "difficulty": "Easy"|"Medium"|"Hard", "reasoning": "..." }`,
        BLOOM_CLASSIFICATION: `You are an educational assessment expert. Classify this question according to Bloom's Taxonomy. Return JSON: { "level": "Remember"|"Understand"|"Apply"|"Analyze"|"Evaluate"|"Create", "reasoning": "..." }`,
        SIMILAR_QUESTION: `You are an expert exam question writer. Given an existing question, generate a similar but distinct question on the same topic. Return in strict JSON format matching the original structure with keys: question, optionA, optionB, optionC, optionD, answer, explanation.`,
        QUESTION_IMPROVEMENT: `You are an expert exam content editor. Review this question and suggest specific improvements for clarity, accuracy, and appropriateness for competitive exams. Return JSON: { "suggestions": ["...", "..."], "improvedQuestion": "..." }`,
    };
    return prompts[purpose];
}
// ─── Log to database ─────────────────────────────────────────────────────────
async function logRequest(userId, purpose, prompt, result, status) {
    return prisma_1.default.aIRequestLog.create({
        data: {
            userId,
            provider: result.provider,
            purpose,
            prompt,
            response: result.response,
            tokenUsage: result.tokenUsage,
            executionTime: result.executionTime,
            status,
        },
    });
}
// ─── AI Operations ────────────────────────────────────────────────────────────
const generateQuestion = async (userId, topic, difficulty, subject, language = "English") => {
    const prompt = `Topic: ${topic}\nDifficulty: ${difficulty}\nSubject: ${subject}\nLanguage: ${language}`;
    const result = await callLLM(client_1.AIPromptPurpose.QUESTION_GENERATION, prompt, userId);
    const log = await logRequest(userId, client_1.AIPromptPurpose.QUESTION_GENERATION, prompt, result, client_1.AIRequestStatus.SUCCESS);
    // Parse and persist generated question
    try {
        const parsed = JSON.parse(result.response.replace(/```json|```/g, "").trim());
        const generated = await prisma_1.default.aIGeneratedQuestion.create({
            data: {
                requestId: log.id,
                question: parsed.question,
                optionA: parsed.optionA,
                optionB: parsed.optionB,
                optionC: parsed.optionC,
                optionD: parsed.optionD,
                answer: parsed.answer,
                explanation: parsed.explanation,
                difficulty: difficulty.toUpperCase(),
                subject,
                topic,
            },
        });
        return { log, generated };
    }
    catch {
        return { log, generated: null, rawResponse: result.response };
    }
};
exports.generateQuestion = generateQuestion;
const generateExplanation = async (userId, questionText) => {
    const result = await callLLM(client_1.AIPromptPurpose.EXPLANATION, questionText, userId);
    await logRequest(userId, client_1.AIPromptPurpose.EXPLANATION, questionText, result, client_1.AIRequestStatus.SUCCESS);
    return result.response;
};
exports.generateExplanation = generateExplanation;
const translateToHindi = async (userId, text) => {
    const result = await callLLM(client_1.AIPromptPurpose.TRANSLATION, text, userId);
    await logRequest(userId, client_1.AIPromptPurpose.TRANSLATION, text, result, client_1.AIRequestStatus.SUCCESS);
    return result.response;
};
exports.translateToHindi = translateToHindi;
const generateDistractors = async (userId, question, correctAnswer) => {
    const prompt = `Question: ${question}\nCorrect Answer: ${correctAnswer}`;
    const result = await callLLM(client_1.AIPromptPurpose.DISTRACTOR_GENERATION, prompt, userId);
    await logRequest(userId, client_1.AIPromptPurpose.DISTRACTOR_GENERATION, prompt, result, client_1.AIRequestStatus.SUCCESS);
    try {
        return JSON.parse(result.response.replace(/```json|```/g, "").trim());
    }
    catch {
        return { raw: result.response };
    }
};
exports.generateDistractors = generateDistractors;
const checkDuplicate = async (userId, questionText) => {
    const result = await callLLM(client_1.AIPromptPurpose.DUPLICATE_CHECK, questionText, userId);
    await logRequest(userId, client_1.AIPromptPurpose.DUPLICATE_CHECK, questionText, result, client_1.AIRequestStatus.SUCCESS);
    try {
        return JSON.parse(result.response.replace(/```json|```/g, "").trim());
    }
    catch {
        return { raw: result.response };
    }
};
exports.checkDuplicate = checkDuplicate;
const cleanOCR = async (userId, rawText) => {
    const result = await callLLM(client_1.AIPromptPurpose.OCR_CLEANUP, rawText, userId);
    await logRequest(userId, client_1.AIPromptPurpose.OCR_CLEANUP, rawText, result, client_1.AIRequestStatus.SUCCESS);
    return result.response;
};
exports.cleanOCR = cleanOCR;
const fixGrammar = async (userId, text) => {
    const result = await callLLM(client_1.AIPromptPurpose.GRAMMAR_FIX, text, userId);
    await logRequest(userId, client_1.AIPromptPurpose.GRAMMAR_FIX, text, result, client_1.AIRequestStatus.SUCCESS);
    return result.response;
};
exports.fixGrammar = fixGrammar;
const estimateDifficulty = async (userId, questionText) => {
    const result = await callLLM(client_1.AIPromptPurpose.DIFFICULTY_ESTIMATION, questionText, userId);
    await logRequest(userId, client_1.AIPromptPurpose.DIFFICULTY_ESTIMATION, questionText, result, client_1.AIRequestStatus.SUCCESS);
    try {
        return JSON.parse(result.response.replace(/```json|```/g, "").trim());
    }
    catch {
        return { raw: result.response };
    }
};
exports.estimateDifficulty = estimateDifficulty;
const classifyBloom = async (userId, questionText) => {
    const result = await callLLM(client_1.AIPromptPurpose.BLOOM_CLASSIFICATION, questionText, userId);
    await logRequest(userId, client_1.AIPromptPurpose.BLOOM_CLASSIFICATION, questionText, result, client_1.AIRequestStatus.SUCCESS);
    try {
        return JSON.parse(result.response.replace(/```json|```/g, "").trim());
    }
    catch {
        return { raw: result.response };
    }
};
exports.classifyBloom = classifyBloom;
const generateSimilarQuestion = async (userId, questionText) => {
    const result = await callLLM(client_1.AIPromptPurpose.SIMILAR_QUESTION, questionText, userId);
    const log = await logRequest(userId, client_1.AIPromptPurpose.SIMILAR_QUESTION, questionText, result, client_1.AIRequestStatus.SUCCESS);
    try {
        const parsed = JSON.parse(result.response.replace(/```json|```/g, "").trim());
        const generated = await prisma_1.default.aIGeneratedQuestion.create({
            data: {
                requestId: log.id,
                question: parsed.question,
                optionA: parsed.optionA,
                optionB: parsed.optionB,
                optionC: parsed.optionC,
                optionD: parsed.optionD,
                answer: parsed.answer,
                explanation: parsed.explanation,
            },
        });
        return { log, generated };
    }
    catch {
        return { log, rawResponse: result.response };
    }
};
exports.generateSimilarQuestion = generateSimilarQuestion;
const suggestImprovements = async (userId, questionText) => {
    const result = await callLLM(client_1.AIPromptPurpose.QUESTION_IMPROVEMENT, questionText, userId);
    await logRequest(userId, client_1.AIPromptPurpose.QUESTION_IMPROVEMENT, questionText, result, client_1.AIRequestStatus.SUCCESS);
    try {
        return JSON.parse(result.response.replace(/```json|```/g, "").trim());
    }
    catch {
        return { raw: result.response };
    }
};
exports.suggestImprovements = suggestImprovements;
const getHistory = async (userId, userRole) => {
    const where = userRole === "ADMIN" ? {} : { userId };
    return prisma_1.default.aIGeneratedQuestion.findMany({
        where: { request: where },
        include: { request: { select: { purpose: true, provider: true, createdAt: true, userId: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
    });
};
exports.getHistory = getHistory;
const approveQuestion = async (id) => {
    return prisma_1.default.aIGeneratedQuestion.update({ where: { id }, data: { approved: true } });
};
exports.approveQuestion = approveQuestion;
const importQuestion = async (id) => {
    const aiQ = await prisma_1.default.aIGeneratedQuestion.findUniqueOrThrow({ where: { id } });
    const question = await prisma_1.default.question.create({
        data: {
            question: aiQ.question,
            optionA: aiQ.optionA,
            optionB: aiQ.optionB,
            optionC: aiQ.optionC,
            optionD: aiQ.optionD,
            correctAnswer: aiQ.answer,
            explanation: aiQ.explanation,
            difficulty: aiQ.difficulty,
            subject: aiQ.subject ?? undefined,
            topic: aiQ.topic ?? undefined,
            isBank: true,
            status: "Draft",
        },
    });
    await prisma_1.default.aIGeneratedQuestion.update({ where: { id }, data: { imported: true } });
    return question;
};
exports.importQuestion = importQuestion;
const rejectQuestion = async (id) => {
    return prisma_1.default.aIGeneratedQuestion.delete({ where: { id } });
};
exports.rejectQuestion = rejectQuestion;
