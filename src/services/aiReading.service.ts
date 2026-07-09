import prisma from "../utils/prisma";
import crypto from "crypto";
import { AIPromptPurpose, AIRequestStatus } from "@prisma/client";
import { callLLM, logRequest } from "./ai.service";

const getCacheHash = (purpose: string, prompt: string) => {
  return crypto.createHash("sha256").update(`${purpose}:${prompt}`).digest("hex");
};

const getCachedResponse = async (requestHash: string) => {
  const cached = await prisma.aICache.findUnique({ where: { requestHash } });
  if (cached && (!cached.expiresAt || cached.expiresAt > new Date())) {
    return cached.response;
  }
  return null;
};

const setCachedResponse = async (requestHash: string, prompt: string, response: string, provider: string) => {
  await prisma.aICache.upsert({
    where: { requestHash },
    update: { response, provider, createdAt: new Date() },
    create: { requestHash, prompt, response, provider },
  });
};

const callCachedLLM = async (purpose: AIPromptPurpose, prompt: string, userId: string) => {
  const requestHash = getCacheHash(purpose, prompt);
  const cachedResponse = await getCachedResponse(requestHash);
  if (cachedResponse) {
    return cachedResponse;
  }

  const result = await callLLM(purpose, prompt, userId);
  await logRequest(userId, purpose, prompt, result, AIRequestStatus.SUCCESS);
  
  await setCachedResponse(requestHash, prompt, result.response, result.provider);
  
  return result.response;
};

export const explainText = async (userId: string, text: string, context?: string) => {
  const prompt = `Explain the following text clearly.\nContext: ${context || "None"}\nText: ${text}`;
  return callCachedLLM(AIPromptPurpose.CONTEXTUAL_EXPLANATION, prompt, userId);
};

export const simplifyText = async (userId: string, text: string) => {
  const prompt = `Simplify the following text so that it's easy to understand for a beginner:\n${text}`;
  return callCachedLLM(AIPromptPurpose.SIMPLIFY_TEXT, prompt, userId);
};

export const translateText = async (userId: string, text: string, targetLanguage: string) => {
  const prompt = `Translate the following text into ${targetLanguage}:\n${text}`;
  return callCachedLLM(AIPromptPurpose.TRANSLATION, prompt, userId);
};

export const generateSummary = async (userId: string, text: string) => {
  const prompt = `Provide a concise summary of the following text:\n${text}`;
  return callCachedLLM(AIPromptPurpose.STUDY_SUMMARY, prompt, userId);
};

export const extractVocabulary = async (userId: string, text: string) => {
  const prompt = `Extract difficult or important vocabulary words from this text and provide their meanings in JSON format like [{ "word": "...", "meaning": "...", "partOfSpeech": "..." }]:\n${text}`;
  const response = await callCachedLLM(AIPromptPurpose.VOCABULARY_EXTRACTION, prompt, userId);
  try {
    return JSON.parse(response.replace(/```json|```/g, "").trim());
  } catch {
    return { raw: response };
  }
};

export const generateFlashcards = async (userId: string, text: string) => {
  const prompt = `Generate 5 flashcards from the following text. Return in JSON array format like [{ "front": "...", "back": "..." }]:\n${text}`;
  const response = await callCachedLLM(AIPromptPurpose.FLASHCARD_GENERATION, prompt, userId);
  try {
    return JSON.parse(response.replace(/```json|```/g, "").trim());
  } catch {
    return { raw: response };
  }
};

export const generateQuizFromStudy = async (userId: string, materialId: string, text: string, numQuestions: number = 5) => {
  const prompt = `Generate ${numQuestions} multiple choice questions from this text. Return JSON array: [{ "question": "...", "options": ["A", "B", "C", "D"], "answer": "...", "explanation": "..." }]\nText: ${text}`;
  const response = await callCachedLLM(AIPromptPurpose.QUIZ_GENERATION, prompt, userId);
  
  let generatedData;
  try {
    generatedData = JSON.parse(response.replace(/```json|```/g, "").trim());
  } catch {
    generatedData = { raw: response };
  }
  
  // Save to AIGeneratedStudyDraft first as per requirement
  const draft = await prisma.aIGeneratedStudyDraft.create({
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
