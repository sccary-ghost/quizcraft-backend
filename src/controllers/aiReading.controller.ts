import { Request, Response, NextFunction } from "express";
import * as aiReadingService from "../services/aiReading.service";

export const explain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { text, context } = req.body;
    const response = await aiReadingService.explainText(userId, text, context);
    res.json({ response });
  } catch (error) {
    next(error);
  }
};

export const simplify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { text } = req.body;
    const response = await aiReadingService.simplifyText(userId, text);
    res.json({ response });
  } catch (error) {
    next(error);
  }
};

export const translate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { text, targetLanguage } = req.body;
    const response = await aiReadingService.translateText(userId, text, targetLanguage);
    res.json({ response });
  } catch (error) {
    next(error);
  }
};

export const summarize = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { text } = req.body;
    const response = await aiReadingService.generateSummary(userId, text);
    res.json({ response });
  } catch (error) {
    next(error);
  }
};

export const extractVocab = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { text } = req.body;
    const response = await aiReadingService.extractVocabulary(userId, text);
    res.json({ response });
  } catch (error) {
    next(error);
  }
};

export const generateFlashcards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { text } = req.body;
    const response = await aiReadingService.generateFlashcards(userId, text);
    res.json({ response });
  } catch (error) {
    next(error);
  }
};

export const generateStudyQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { materialId, text, numQuestions } = req.body;
    const draft = await aiReadingService.generateQuizFromStudy(userId, materialId, text, numQuestions);
    res.json(draft);
  } catch (error) {
    next(error);
  }
};
