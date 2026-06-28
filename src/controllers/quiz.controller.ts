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
} from "../services/quiz.service";
import prisma from "../utils/prisma"; // Ye line add karo!
export const create = async (req: Request, res: Response) => {
  try {
    const { title, description, duration } = req.body;
    const result = await createQuiz(title, description, duration);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const add = async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    const { question, optionA, optionB, optionC, optionD, correctAnswer } = req.body;
    const result = await addQuestion(quizId, question, optionA, optionB, optionC, optionD, correctAnswer);
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