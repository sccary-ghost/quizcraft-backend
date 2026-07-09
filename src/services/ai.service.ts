import prisma from "../utils/prisma";
import { AIProvider, AIRequestStatus, AIPromptPurpose, Difficulty } from "@prisma/client";
import pLimit from "p-limit";

const aiConcurrencyLimit = pLimit(5);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries === 0 || err.name === "AbortError") throw err;
    await sleep(delay);
    return withRetry(fn, retries - 1, delay * 2);
  }
}

async function callWithProvider(
  providerConfig: any,
  fullPrompt: string,
  signal?: AbortSignal
): Promise<{ response: string; tokenUsage: number }> {
  const provider: AIProvider = providerConfig.provider;
  const apiKey = providerConfig.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
  const modelName = providerConfig.modelName ?? "gemini-2.0-flash";
  const temperature = providerConfig.temperature ?? 0.7;
  const maxTokens = providerConfig.maxTokens ?? 2048;

  let response = "";
  let tokenUsage = 0;

  if (provider === AIProvider.GEMINI) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
        signal,
      }
    );
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    response = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    tokenUsage = data?.usageMetadata?.totalTokenCount ?? 0;
  } else if (provider === AIProvider.OPENAI) {
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
      signal,
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    response = data?.choices?.[0]?.message?.content ?? "";
    tokenUsage = data?.usage?.total_tokens ?? 0;
  } else if (provider === AIProvider.OLLAMA) {
    const endpoint = providerConfig.endpoint ?? "http://localhost:11434";
    const res = await fetch(`${endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName, prompt: fullPrompt, stream: false }),
      signal,
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    response = data?.response ?? "";
  }

  return { response, tokenUsage };
}

export async function callLLM(
  purpose: AIPromptPurpose,
  userContent: string,
  userId: string,
  externalSignal?: AbortSignal
): Promise<{ response: string; provider: AIProvider; tokenUsage: number; executionTime: number }> {
  const providers = await prisma.aIProviderConfig.findMany({
    where: { enabled: true },
    orderBy: { updatedAt: "desc" },
  });

  if (providers.length === 0) {
    throw new Error("No enabled AI providers found");
  }

  const template = await prisma.aIPromptTemplate.findFirst({
    where: { purpose, enabled: true },
  });

  const systemPrompt = template?.prompt ?? getDefaultPrompt(purpose);
  const fullPrompt = `${systemPrompt}\n\nUser Input:\n${userContent}`;

  const startTime = Date.now();
  let lastError: any;

  // Setup timeout abort signal if no external signal is provided
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  const signal = externalSignal ?? controller.signal;

  try {
    for (const provider of providers) {
      try {
        const result = await withRetry(() => callWithProvider(provider, fullPrompt, signal));
        const executionTime = Date.now() - startTime;
        return { ...result, provider: provider.provider, executionTime };
      } catch (err: any) {
        lastError = err;
        if (err.name === "AbortError") throw err; // Don't fallback on timeout/client abort
        console.warn(`Provider ${provider.provider} failed, trying next...`, err.message);
        continue;
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
}

// ─── Default system prompts (fallback if no template saved) ──────────────────

export function getDefaultPrompt(purpose: AIPromptPurpose): string {
  const prompts: Partial<Record<AIPromptPurpose, string>> = {
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
  return prompts[purpose] ?? "You are a helpful AI assistant.";
}

// ─── Log to database ─────────────────────────────────────────────────────────

export async function logRequest(
  userId: string,
  purpose: AIPromptPurpose,
  prompt: string,
  result: { response: string; provider: AIProvider; tokenUsage: number; executionTime: number },
  status: AIRequestStatus
) {
  return prisma.aIRequestLog.create({
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

export const generateQuestion = (
  userId: string,
  topic: string,
  difficulty: string,
  subject: string,
  language = "English",
  signal?: AbortSignal
) =>
  aiConcurrencyLimit(async () => {
    const prompt = `Topic: ${topic}\nDifficulty: ${difficulty}\nSubject: ${subject}\nLanguage: ${language}`;
    const result = await callLLM(AIPromptPurpose.QUESTION_GENERATION, prompt, userId, signal);

    const log = await logRequest(userId, AIPromptPurpose.QUESTION_GENERATION, prompt, result, AIRequestStatus.SUCCESS);

    // Parse and persist generated question
    try {
      const parsed = JSON.parse(result.response.replace(/```json|```/g, "").trim());
      const generated = await prisma.aIGeneratedQuestion.create({
        data: {
          requestId: log.id,
          question: parsed.question,
          optionA: parsed.optionA,
          optionB: parsed.optionB,
          optionC: parsed.optionC,
          optionD: parsed.optionD,
          answer: parsed.answer,
          explanation: parsed.explanation,
          difficulty: difficulty.toUpperCase() as Difficulty,
          subject,
          topic,
        },
      });
      return { log, generated };
    } catch {
      return { log, generated: null, rawResponse: result.response };
    }
  });

export const generateExplanation = async (userId: string, questionText: string) => {
  const result = await callLLM(AIPromptPurpose.EXPLANATION, questionText, userId);
  await logRequest(userId, AIPromptPurpose.EXPLANATION, questionText, result, AIRequestStatus.SUCCESS);
  return result.response;
};

export const translateToHindi = async (userId: string, text: string) => {
  const result = await callLLM(AIPromptPurpose.TRANSLATION, text, userId);
  await logRequest(userId, AIPromptPurpose.TRANSLATION, text, result, AIRequestStatus.SUCCESS);
  return result.response;
};

export const generateDistractors = async (userId: string, question: string, correctAnswer: string) => {
  const prompt = `Question: ${question}\nCorrect Answer: ${correctAnswer}`;
  const result = await callLLM(AIPromptPurpose.DISTRACTOR_GENERATION, prompt, userId);
  await logRequest(userId, AIPromptPurpose.DISTRACTOR_GENERATION, prompt, result, AIRequestStatus.SUCCESS);
  try {
    return JSON.parse(result.response.replace(/```json|```/g, "").trim());
  } catch {
    return { raw: result.response };
  }
};

export const checkDuplicate = async (userId: string, questionText: string) => {
  const result = await callLLM(AIPromptPurpose.DUPLICATE_CHECK, questionText, userId);
  await logRequest(userId, AIPromptPurpose.DUPLICATE_CHECK, questionText, result, AIRequestStatus.SUCCESS);
  try {
    return JSON.parse(result.response.replace(/```json|```/g, "").trim());
  } catch {
    return { raw: result.response };
  }
};

export const cleanOCR = async (userId: string, rawText: string) => {
  const result = await callLLM(AIPromptPurpose.OCR_CLEANUP, rawText, userId);
  await logRequest(userId, AIPromptPurpose.OCR_CLEANUP, rawText, result, AIRequestStatus.SUCCESS);
  return result.response;
};

export const fixGrammar = async (userId: string, text: string) => {
  const result = await callLLM(AIPromptPurpose.GRAMMAR_FIX, text, userId);
  await logRequest(userId, AIPromptPurpose.GRAMMAR_FIX, text, result, AIRequestStatus.SUCCESS);
  return result.response;
};

export const estimateDifficulty = async (userId: string, questionText: string) => {
  const result = await callLLM(AIPromptPurpose.DIFFICULTY_ESTIMATION, questionText, userId);
  await logRequest(userId, AIPromptPurpose.DIFFICULTY_ESTIMATION, questionText, result, AIRequestStatus.SUCCESS);
  try {
    return JSON.parse(result.response.replace(/```json|```/g, "").trim());
  } catch {
    return { raw: result.response };
  }
};

export const classifyBloom = async (userId: string, questionText: string) => {
  const result = await callLLM(AIPromptPurpose.BLOOM_CLASSIFICATION, questionText, userId);
  await logRequest(userId, AIPromptPurpose.BLOOM_CLASSIFICATION, questionText, result, AIRequestStatus.SUCCESS);
  try {
    return JSON.parse(result.response.replace(/```json|```/g, "").trim());
  } catch {
    return { raw: result.response };
  }
};

export const generateSimilarQuestion = async (userId: string, questionText: string) => {
  const result = await callLLM(AIPromptPurpose.SIMILAR_QUESTION, questionText, userId);
  const log = await logRequest(userId, AIPromptPurpose.SIMILAR_QUESTION, questionText, result, AIRequestStatus.SUCCESS);
  try {
    const parsed = JSON.parse(result.response.replace(/```json|```/g, "").trim());
    const generated = await prisma.aIGeneratedQuestion.create({
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
  } catch {
    return { log, rawResponse: result.response };
  }
};

export const suggestImprovements = async (userId: string, questionText: string) => {
  const result = await callLLM(AIPromptPurpose.QUESTION_IMPROVEMENT, questionText, userId);
  await logRequest(userId, AIPromptPurpose.QUESTION_IMPROVEMENT, questionText, result, AIRequestStatus.SUCCESS);
  try {
    return JSON.parse(result.response.replace(/```json|```/g, "").trim());
  } catch {
    return { raw: result.response };
  }
};

export const getHistory = async (userId: string, userRole: string) => {
  const where = userRole === "ADMIN" ? {} : { userId };
  return prisma.aIGeneratedQuestion.findMany({
    where: { request: where },
    include: { request: { select: { purpose: true, provider: true, createdAt: true, userId: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
};

export const approveQuestion = async (id: string) => {
  return prisma.aIGeneratedQuestion.update({ where: { id }, data: { approved: true } });
};

export const importQuestion = async (id: string) => {
  const aiQ = await prisma.aIGeneratedQuestion.findUniqueOrThrow({ where: { id } });
  const question = await prisma.question.create({
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
  await prisma.aIGeneratedQuestion.update({ where: { id }, data: { imported: true } });
  return question;
};

export const rejectQuestion = async (id: string) => {
  return prisma.aIGeneratedQuestion.delete({ where: { id } });
};
