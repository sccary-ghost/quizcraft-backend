import { Request, Response } from "express";
import * as AIService from "../services/ai.service";

export const generate = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { topic, difficulty, subject, language } = req.body;
    if (!topic) return res.status(400).json({ message: "topic is required" });
    const result = await AIService.generateQuestion(userId, topic, difficulty || "Medium", subject || "General", language);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const explain = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { questionText } = req.body;
    if (!questionText) return res.status(400).json({ message: "questionText is required" });
    const result = await AIService.generateExplanation(userId, questionText);
    res.json({ explanation: result });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const translate = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "text is required" });
    const result = await AIService.translateToHindi(userId, text);
    res.json({ translation: result });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const distractors = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { question, correctAnswer } = req.body;
    if (!question || !correctAnswer) return res.status(400).json({ message: "question and correctAnswer are required" });
    const result = await AIService.generateDistractors(userId, question, correctAnswer);
    res.json({ distractors: result });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const duplicateCheck = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { questionText } = req.body;
    if (!questionText) return res.status(400).json({ message: "questionText is required" });
    const result = await AIService.checkDuplicate(userId, questionText);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const ocrClean = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { rawText } = req.body;
    if (!rawText) return res.status(400).json({ message: "rawText is required" });
    const result = await AIService.cleanOCR(userId, rawText);
    res.json({ cleaned: result });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const grammarFix = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "text is required" });
    const result = await AIService.fixGrammar(userId, text);
    res.json({ corrected: result });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const difficulty = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { questionText } = req.body;
    if (!questionText) return res.status(400).json({ message: "questionText is required" });
    const result = await AIService.estimateDifficulty(userId, questionText);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const bloom = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { questionText } = req.body;
    if (!questionText) return res.status(400).json({ message: "questionText is required" });
    const result = await AIService.classifyBloom(userId, questionText);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const similar = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { questionText } = req.body;
    if (!questionText) return res.status(400).json({ message: "questionText is required" });
    const result = await AIService.generateSimilarQuestion(userId, questionText);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const improve = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { questionText } = req.body;
    if (!questionText) return res.status(400).json({ message: "questionText is required" });
    const result = await AIService.suggestImprovements(userId, questionText);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const history = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const result = await AIService.getHistory(userId, role);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const approve = async (req: Request, res: Response) => {
  try {
    const result = await AIService.approveQuestion(req.params.id as string);
    res.json({ message: "Approved", result });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const importToBank = async (req: Request, res: Response) => {
  try {
    const result = await AIService.importQuestion(req.params.id as string);
    res.json({ message: "Imported to Question Bank", question: result });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const reject = async (req: Request, res: Response) => {
  try {
    await AIService.rejectQuestion(req.params.id as string);
    res.json({ message: "Rejected and deleted" });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};
