import { Request, Response } from "express";
import {
  createQuiz,
  getQuizById,
  submitQuiz,
  getAttemptById,
  getAllQuizzes,
  getUserHistory,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  moveQuizToTrash,
  restoreQuiz,
  updateQuiz,
  startQuizAttempt,
  updateQuizStatuses,
  getQuestionVersionsList,
  restoreQuestionRevision,
  updateQuestionStatus,
  addReviewComment,
  getReviewCommentsList,
  getTrashItems,
  restoreQuestion,
  deleteQuestionPermanently,
  deleteQuizPermanently,
  exportDatabaseBackup,
  importDatabaseBackup,
} from "../services/quiz.service";

import prisma from "../utils/prisma";
import { logAuditAction } from "../utils/auditLogger";

export const create = async (req: Request, res: Response) => {
  try {
    const { title, description, duration, sections, schedulingData } = req.body;
    const result = await createQuiz(title, description, duration, sections, schedulingData);
    const quizId = result.quiz?.id || (result as any).id;
    await logAuditAction(req, "Test Created", quizId);
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
    const createdQuestionId = result.question?.id || (result as any).id;
    await logAuditAction(req, "Question Created", createdQuestionId);
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
    const isAdmin = req.query.admin === "true";
    const quiz = await getQuizById(quizId, isAdmin);
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
      req.body.correctAnswer,
      req.body.explanation,
      req.body.subject,
      req.body.chapter,
      req.body.topic
    );
    await logAuditAction(req, "Question Edited", questionId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getVersions = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.questionId as string;
    const list = await getQuestionVersionsList(questionId);
    res.json(list);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const restoreVersion = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.questionId as string;
    const versionId = req.params.versionId as string;
    const restored = await restoreQuestionRevision(questionId, versionId);
    await logAuditAction(req, "Question Restored", questionId);
    res.json({ message: "Version restored successfully", question: restored });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.questionId as string;
    await deleteQuestion(questionId);
    await logAuditAction(req, "Question Deleted", questionId);
    res.json({ message: "Question deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
export const trashQuiz = async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    await moveQuizToTrash(quizId);
    await logAuditAction(req, "Test Deleted", quizId);
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
    const quizId = req.params.quizId as string;
    await restoreQuiz(quizId);
    await logAuditAction(req, "Test Restored", quizId);
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
        isDeleted: false,
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
    await logAuditAction(req, "Test Updated", quizId);
    if (req.body.status === "Published" || (result as any).status === "Published") {
      await logAuditAction(req, "Test Published", quizId);
    }
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

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.questionId as string;
    const status = req.body.status as string;
    if (!status) {
      return res.status(400).json({ message: "Status parameter is required" });
    }
    const result = await updateQuestionStatus(questionId, status);
    const logAction = status === "Published"
      ? "Question Published"
      : status === "Approved"
      ? "Question Approved"
      : `Question status updated to ${status}`;
    await logAuditAction(req, logAction, questionId);
    res.json({ message: "Status updated successfully", question: result });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.questionId as string;
    const comment = req.body.comment as string;
    const authorName = req.body.authorName as string | undefined;
    if (!comment) {
      return res.status(400).json({ message: "Comment is required" });
    }
    const result = await addReviewComment(questionId, comment, authorName);
    res.json({ message: "Comment added successfully", comment: result });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getComments = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.questionId as string;
    const list = await getReviewCommentsList(questionId);
    res.json(list);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getTrash = async (req: Request, res: Response) => {
  try {
    const trash = await getTrashItems();
    res.json(trash);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const restoreQuestionController = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.questionId as string;
    const restored = await restoreQuestion(questionId);
    await logAuditAction(req, "Question Restored", questionId);
    res.json({ message: "Question restored successfully", question: restored });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteQuestionPermanentlyController = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.questionId as string;
    await deleteQuestionPermanently(questionId);
    await logAuditAction(req, "Question Deleted Forever", questionId);
    res.json({ message: "Question permanently deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteQuizPermanentlyController = async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    await deleteQuizPermanently(quizId);
    await logAuditAction(req, "Test Deleted Forever", quizId);
    res.json({ message: "Quiz permanently deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const exportBackup = async (req: Request, res: Response) => {
  try {
    const backupData = await exportDatabaseBackup();
    await logAuditAction(req, "Backup Exported");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=quizcraft_backup_${Date.now()}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const importBackup = async (req: Request, res: Response) => {
  try {
    const { backupData, strategy } = req.body;
    if (!backupData) {
      return res.status(400).json({ message: "backupData parameter is required" });
    }
    if (strategy !== "merge" && strategy !== "overwrite") {
      return res.status(400).json({ message: "Invalid strategy. Must be 'merge' or 'overwrite'" });
    }

    const currentAdminId = (req as any).user?.userId;
    await importDatabaseBackup(backupData, strategy, currentAdminId);

    await logAuditAction(req, `Backup Restored (${strategy})`);

    res.json({ message: `Database backup imported successfully using ${strategy} strategy` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const exportQuizReportCSV = async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        attempts: {
          include: {
            user: true,
          },
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const csvRows = [];
    csvRows.push(`"Quiz Performance Report"`);
    csvRows.push(`"Quiz Title","${quiz.title.replace(/"/g, '""')}"`);
    csvRows.push(`"Duration","${quiz.duration} minutes"`);
    csvRows.push(`"Exported At","${new Date().toLocaleString()}"`);
    csvRows.push("");

    csvRows.push(`"Candidate Name","Email","Mobile Number","Score","Percentage (%)","Submitted At","Status"`);

    for (const att of quiz.attempts) {
      const name = att.user.name || "N/A";
      const email = att.user.email || "N/A";
      const mobile = att.user.mobileNumber || "N/A";
      const score = att.score;
      const percentage = att.percentage.toFixed(2);
      const date = att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "In Progress";
      const status = att.completed ? "Completed" : "Ongoing";

      csvRows.push(`"${name.replace(/"/g, '""')}","${email.replace(/"/g, '""')}","${mobile.replace(/"/g, '""')}",${score},${percentage},"${date}","${status}"`);
    }

    await logAuditAction(req, "Test Report Exported (CSV)", quizId);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=quiz_report_${quizId}_${Date.now()}.csv`);
    res.send(csvRows.join("\n"));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const exportQuizReportExcel = async (req: Request, res: Response) => {
  try {
    const quizId = req.params.quizId as string;
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        attempts: {
          include: {
            user: true,
          },
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; }
          th { background-color: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
        </style>
      </head>
      <body>
        <h2>Quiz Performance Report</h2>
        <p><strong>Quiz Title:</strong> ${quiz.title}</p>
        <p><strong>Duration:</strong> ${quiz.duration} minutes</p>
        <p><strong>Exported At:</strong> ${new Date().toLocaleString()}</p>
        <br/>
        <table>
          <thead>
            <tr>
              <th>Candidate Name</th>
              <th>Email</th>
              <th>Mobile Number</th>
              <th>Score</th>
              <th>Percentage (%)</th>
              <th>Submitted At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const att of quiz.attempts) {
      const name = att.user.name || "N/A";
      const email = att.user.email || "N/A";
      const mobile = att.user.mobileNumber || "N/A";
      const score = att.score;
      const percentage = att.percentage.toFixed(2);
      const date = att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "In Progress";
      const status = att.completed ? "Completed" : "Ongoing";

      html += `
        <tr>
          <td>${name}</td>
          <td>${email}</td>
          <td>${mobile}</td>
          <td>${score}</td>
          <td>${percentage}</td>
          <td>${date}</td>
          <td>${status}</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    await logAuditAction(req, "Test Report Exported (Excel)", quizId);

    res.setHeader("Content-Type", "application/vnd.ms-excel");
    res.setHeader("Content-Disposition", `attachment; filename=quiz_report_${quizId}_${Date.now()}.xls`);
    res.send(html);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};