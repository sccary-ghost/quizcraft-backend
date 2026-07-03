import { Request, Response } from "express";
import {
  createQuiz,
  addQuestion,
  getQuizById,
  submitQuiz,
  getAttemptById,
  getAllQuizzes,
  getUserHistory,
  updateQuestion,
  deleteQuestion,
  moveQuizToTrash,
  restoreQuiz,
  updateQuiz,
  startQuizAttempt,
  updateQuizStatuses,
} from "../services/quiz.service";

import prisma from "../utils/prisma"; // Ye line add karo!
export const create = async (req: Request, res: Response) => {
  try {
    const { title, description, duration, sections, schedulingData } = req.body;
    const result = await createQuiz(title, description, duration, sections, schedulingData);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const add = async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    const {
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation,
      subject,
      chapter,
      topic,
      sectionId,
    } = req.body;
    const result = await addQuestion(
      quizId,
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation,
      subject,
      chapter,
      topic,
      sectionId
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getAll = async (req: Request, res: Response) => {
  try {
    const quizzes = await getAllQuizzes();
    res.json(quizzes);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getQuiz = async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    const quiz = await getQuizById(quizId);
    res.json(quiz);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const submit = async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    const { answers, questionTimes } = req.body; 
    const userId = (req as any).user.userId;

    // This must match the signature of the service function exactly
    const result = await submitQuiz(userId, quizId, answers, questionTimes || {});
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getAttempt = async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.attemptId as string;
    const attempt = await getAttemptById(attemptId);
    res.json(attempt);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const history = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const attempts = await getUserHistory(userId);
    res.json(attempts);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.questionId as string;
    const result = await updateQuestion(
      questionId,
      req.body.question,
      req.body.optionA,
      req.body.optionB,
      req.body.optionC,
      req.body.optionD,
      req.body.correctAnswer
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await deleteQuestion(req.params.questionId as string);
    res.json({ message: "Question deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
export const trashQuiz = async (req: Request, res: Response) => {
  try {

    await moveQuizToTrash(req.params.quizId as string);
    res.json({
      message: "Quiz moved to Trash successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    });
  }
};
export const restoreQuizController = async (
  req: Request,
  res: Response
) => {
  try {
    await restoreQuiz(req.params.quizId as string);

    res.json({
      message: "Quiz restored successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    });
  }
};
export const getBankQuestions = async (req: Request, res: Response) => {
  try {
    const { subject, chapter } = req.query;

    const questions = await prisma.question.findMany({
      where: {
        isBank: true,
        ...(subject && { subject: subject as string }),
        ...(chapter && { chapter: chapter as string }),
      },
    });

    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    await updateQuizStatuses();

    const totalQuizzes = await prisma.quiz.count({
      where: { isDeleted: false },
    });

    const draftQuizzes = await prisma.quiz.count({
      where: { isDeleted: false, status: "Draft" },
    });

    const scheduledQuizzes = await prisma.quiz.count({
      where: { isDeleted: false, status: "Scheduled" },
    });

    const liveQuizzes = await prisma.quiz.count({
      where: { isDeleted: false, status: "Live" },
    });

    const completedQuizzes = await prisma.quiz.count({
      where: { isDeleted: false, status: "Completed" },
    });

    const archivedQuizzes = await prisma.quiz.count({
      where: { isDeleted: false, status: "Archived" },
    });

    const questionBank = await prisma.question.count({
      where: { isBank: true },
    });

    // Unique subjects as categories
    const categoriesResult = await prisma.question.groupBy({
      by: ["subject"],
      where: { isBank: true, subject: { not: null } },
    });
    const categories = categoriesResult.length;

    const folders = 0;

    const users = await prisma.user.count();

    const trash = await prisma.quiz.count({
      where: { isDeleted: true },
    });

    // Candidate Stats
    const totalCandidates = users;
    const activeCandidates = await prisma.user.count({
      where: { isActive: true },
    });
    const inactiveCandidates = await prisma.user.count({
      where: { isActive: false },
    });
    const totalTestAttempts = await prisma.attempt.count({
      where: { completed: true },
    });

    res.json({
      totalQuizzes,
      draftQuizzes,
      scheduledQuizzes,
      liveQuizzes,
      completedQuizzes,
      archivedQuizzes,
      questionBank,
      categories,
      folders,
      users,
      trash,
      totalCandidates,
      activeCandidates,
      inactiveCandidates,
      totalTestAttempts,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

import fs from "fs";
import path from "path";

export const uploadImageController = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
    const uploadsDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
    res.json({ url: imageUrl });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateQuizController = async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    const { title, description, duration, sections, schedulingData } = req.body;
    const result = await updateQuiz(
      quizId,
      title,
      description,
      duration,
      sections,
      schedulingData
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const startAttempt = async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    const userId = (req as any).user.userId;
    const result = await startQuizAttempt(userId, quizId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};