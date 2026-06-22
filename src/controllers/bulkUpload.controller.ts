import { Request, Response } from "express";
import path from "path";
import { parseExcel } from "../utils/excelParser";
import { parsePdf } from "../utils/pdfParser";
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

    const extension = path.extname(
      req.file.originalname
    ).toLowerCase();

    let rows: any[] = [];

    if (
      extension === ".xlsx" ||
      extension === ".csv"
    ) {
      rows = parseExcel(
        req.file.buffer
      );
    }

    else if (extension === ".pdf") {

      rows = await parsePdf(
  req.file.buffer
);
    }

    else if (extension === ".docx") {
      return res.status(400).json({
        message:
          "DOCX parser coming next",
      });
    }

    else {
      return res.status(400).json({
        message:
          "Unsupported file type",
      });
    }

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