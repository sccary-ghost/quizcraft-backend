import { Request, Response } from "express";
import prisma from "../utils/prisma";
import {
  generatePracticeSession,
  getPracticeStats,
  getRecommendations,
} from "../services/practice.service";
import { logAuditAction } from "../utils/auditLogger";

// 1. Generate Session
export const createSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { source, filters, adaptive, options } = req.body;

    if (!source) {
      return res.status(400).json({ message: "source is required" });
    }

    const session = await generatePracticeSession(userId, source, filters, adaptive, options);
    if (!session) {
      return res.status(500).json({ message: "Failed to generate practice session." });
    }

    await logAuditAction(req, "Practice Session Generated", session.id);
    res.json({ practiceSessionId: session.id, totalQuestions: session.totalQuestions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get Practice Stats
export const getStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const stats = await getPracticeStats(userId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Get Recommended Practice
export const getRecommended = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const rec = await getRecommendations(userId);
    res.json(rec);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Get Session Details (Including active resume index)
export const getSessionDetails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const id = req.params.id as string;

    const session = await prisma.practiceSession.findFirst({
      where: { id, userId },
      include: {
        questions: {
          include: { question: true },
          orderBy: { order: "asc" },
        },
        snapshot: true,
      },
    });

    if (!session) {
      return res.status(404).json({ message: "Practice Session not found" });
    }

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 5. Submit Single Question Answer (For intermediate saves & resume compatibility)
export const submitSessionAnswer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const sessionId = req.params.id as string;
    const { questionId, selectedAnswer, timeSpent } = req.body;

    if (!questionId) {
      return res.status(400).json({ message: "questionId is required" });
    }

    const session = await prisma.practiceSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const isCorrect = selectedAnswer ? selectedAnswer.trim() === question.correctAnswer.trim() : false;

    // Update PracticeSessionQuestion link
    const psq = await prisma.practiceSessionQuestion.upsert({
      where: {
        practiceSessionId_questionId: {
          practiceSessionId: sessionId,
          questionId,
        },
      },
      update: {
        selectedAnswer,
        isCorrect,
        timeSpent: parseInt(timeSpent) || 0,
      },
      create: {
        practiceSessionId: sessionId,
        questionId,
        selectedAnswer,
        isCorrect,
        timeSpent: parseInt(timeSpent) || 0,
      },
    });

    // Advance session index if it is matching the current question
    const questionsList = await prisma.practiceSessionQuestion.findMany({
      where: { practiceSessionId: sessionId },
      orderBy: { order: "asc" },
    });

    const currentOrder = questionsList.find((q) => q.questionId === questionId)?.order ?? 0;
    const nextIndex = Math.max(session.currentIndex, currentOrder + 1);

    await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        currentIndex: Math.min(nextIndex, session.totalQuestions - 1),
      },
    });

    // Bookmark Spaced Repetition check: If practicing bookmarks, update their intervals dynamically!
    const bookmark = await prisma.bookmark.findFirst({
      where: { userId, questionId },
    });

    if (bookmark) {
      const isAnswerCorrect = selectedAnswer ? selectedAnswer === question.correctAnswer : false;
      const currentInterval = bookmark.revisionCount || 0;
      
      let nextInterval = 1;
      if (isAnswerCorrect) {
        nextInterval = currentInterval === 0 ? 1 : currentInterval * 2;
        if (nextInterval > 60) nextInterval = 60;
      }

      const nextDate = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000);
      const newCorrect = bookmark.correctCount + (isAnswerCorrect ? 1 : 0);
      const newIncorrect = bookmark.incorrectCount + (isAnswerCorrect ? 0 : 1);
      const newTimes = bookmark.timesPracticed + 1;
      const accuracy = (newCorrect / newTimes) * 100;

      let status = bookmark.status;
      if (newTimes >= 3 && accuracy >= 80) {
        status = "MASTERED";
      } else if (isAnswerCorrect) {
        status = "REVIEW";
      } else {
        status = "LEARNING";
      }

      await prisma.bookmark.update({
        where: { id: bookmark.id },
        data: {
          timesPracticed: newTimes,
          correctCount: newCorrect,
          incorrectCount: newIncorrect,
          revisionCount: nextInterval,
          nextRevisionDate: nextDate,
          lastRevisionResult: isAnswerCorrect,
          lastRevisionAt: new Date(),
          lastPracticed: new Date(),
          status,
        },
      });
    }

    res.json({ message: "Answer submitted", isCorrect });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 6. Finish Practice Session
export const finishSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const sessionId = req.params.id as string;

    const session = await prisma.practiceSession.findFirst({
      where: { id: sessionId, userId },
      include: { questions: true },
    });

    if (!session) {
      return res.status(404).json({ message: "Practice Session not found" });
    }

    const answeredList = session.questions;
    const totalQuestions = session.totalQuestions;

    let correctCount = 0;
    let totalTime = 0;

    answeredList.forEach((q) => {
      if (q.isCorrect === true) correctCount++;
      totalTime += q.timeSpent;
    });

    const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const score = accuracy; // score is proportional to correct ratio in practice mode

    const updatedSession = await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        completedAt: new Date(),
        score,
        accuracy,
        timeSpent: totalTime,
      },
    });

    // Write practice logs statistics to bookmark practice logs so standard charts load it
    await prisma.bookmarkPracticeLog.create({
      data: {
        userId,
        questionsCount: totalQuestions,
        correctCount,
        score,
        timeSpent: totalTime,
      },
    });

    await logAuditAction(req, "Practice Session Completed", sessionId);
    res.json({ message: "Practice finalized successfully", session: updatedSession });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
