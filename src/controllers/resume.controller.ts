import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { syncSession, claimSession } from "../services/sessionSync.service";

export const syncState = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const { type, version, clientId, currentIndex, currentSectionId, markedForReview, visitedQuestions, warningCount, answers } = req.body;

    if (!type || !clientId || version === undefined) {
      return res.status(400).json({ message: "type, clientId, and version parameters are required" });
    }

    const result = await syncSession(
      userId,
      id,
      type as "attempt" | "practice",
      {
        version: parseInt(version) || 0,
        clientId,
        currentIndex: parseInt(currentIndex) || 0,
        currentSectionId,
        markedForReview: markedForReview || [],
        visitedQuestions: visitedQuestions || [],
        warningCount: parseInt(warningCount) || 0,
        answers: answers || [],
      },
      req
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const claim = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const { type, clientId } = req.body;

    if (!type || !clientId) {
      return res.status(400).json({ message: "type and clientId parameters are required" });
    }

    const claimed = await claimSession(userId, id, type as "attempt" | "practice", clientId, req);
    if (!claimed) {
      return res.status(404).json({ message: "Active snapshot session not found" });
    }

    res.json({ message: "Session claimed successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Check for active test or practice to prompt resume overlay widget
export const getActive = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const activeAttempt = await prisma.attempt.findFirst({
      where: {
        userId,
        state: { notIn: ["COMPLETED", "AUTO_SUBMITTED", "EXPIRED"] },
      },
      include: {
        quiz: true,
        session: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    const activePractice = await prisma.practiceSession.findFirst({
      where: {
        userId,
        completedAt: null,
      },
      include: {
        snapshot: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      attempt: activeAttempt,
      practice: activePractice,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
