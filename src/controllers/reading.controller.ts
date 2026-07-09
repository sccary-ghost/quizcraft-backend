import { Request, Response, NextFunction } from "express";
import * as readingAnalyticsService from "../services/readingAnalytics.service";

export const updateProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { chapterId } = req.params;
    const progress = await readingAnalyticsService.updateReadingProgress(userId, chapterId as string, req.body);
    res.json(progress);
  } catch (error) {
    next(error);
  }
};

export const getProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { chapterId } = req.params;
    const progress = await readingAnalyticsService.getReadingProgress(userId, chapterId as string);
    res.json(progress);
  } catch (error) {
    next(error);
  }
};

export const logHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { paragraphId, timeSpentMs } = req.body;
    const history = await readingAnalyticsService.logReadingHistory(userId, paragraphId, timeSpentMs);
    res.status(201).json(history);
  } catch (error) {
    next(error);
  }
};

export const startSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const session = await readingAnalyticsService.startReadingSession(userId);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

export const endSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const session = await readingAnalyticsService.endReadingSession(sessionId as string, req.body);
    res.json(session);
  } catch (error) {
    next(error);
  }
};
