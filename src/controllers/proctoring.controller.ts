import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { ProctoringType, ViolationSeverity } from "@prisma/client";

export const recordViolation = async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.attemptId as string;
    const { type, severity, screenshot, details } = req.body;
    if (!type) return res.status(400).json({ message: "type is required" });

    const violation = await prisma.proctoringViolation.create({
      data: {
        attemptId,
        type: type as ProctoringType,
        severity: (severity as ViolationSeverity) ?? ViolationSeverity.MEDIUM,
        screenshot: screenshot ?? null,
        details: details ?? null,
      },
    });

    // Fetch attempt with quiz proctoring config
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true },
    });

    const quiz = attempt?.quiz as any;
    const totalViolations = await prisma.proctoringViolation.count({ where: { attemptId } });
    const warningLimit: number = quiz?.proctorWarningLimit ?? 5;
    const autoSubmit: boolean = quiz?.proctorAutoSubmit ?? false;
    const action: string = quiz?.proctorViolationAction ?? "WARN";

    const shouldAutoSubmit = autoSubmit && totalViolations >= warningLimit;

    res.json({ violation, totalViolations, warningLimit, action, shouldAutoSubmit });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const getViolations = async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.attemptId as string;
    const violations = await prisma.proctoringViolation.findMany({
      where: { attemptId },
      orderBy: { timestamp: "desc" },
    });
    res.json(violations);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const getViolationStats = async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.attemptId as string;
    const violations = await prisma.proctoringViolation.findMany({ where: { attemptId } });

    const stats = violations.reduce((acc: Record<string, number>, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});

    res.json({ total: violations.length, byType: stats });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};
