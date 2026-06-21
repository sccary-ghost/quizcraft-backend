import { Request, Response } from "express";
import { parseExcel } from "../utils/excelParser";
import { bulkUploadQuestions } from "../services/bulkUpload.service";

export const uploadQuestions = async (
  req: Request,
  res: Response
) => {
  try {
    const quizId =
      req.params.quizId as string;

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    const rows = parseExcel(
      req.file.buffer
    );

    const result =
      await bulkUploadQuestions(
        quizId,
        rows
      );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    });
  }
};