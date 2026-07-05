import { Request, Response } from "express";
import { parseQuestionText } from "../utils/parseQuestionText";
import prisma from "../utils/prisma";
import pdfParse from "pdf-parse";

export const uploadQuestions = async (req: Request, res: Response) => {
  try {
    const { subject, chapter, topic } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let fileContent = "";

    // Agar file PDF hai, toh pdf-parse use karo
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      const pdfData = await pdfParse(file.buffer);
      fileContent = pdfData.text;
    } else {
      // Agar CSV ya TXT hai, toh normal buffer to string
      fileContent = file.buffer.toString("utf8");
    }

    // Ab tumhara original parser convert kiye hue text ko parse karega
    const questions = parseQuestionText(fileContent);

    if (questions.length === 0) {
      return res.status(400).json({ 
        message: "No questions extracted. Ensure your PDF has standard numbering like '1.' and options like '(a)'." 
      });
    }

    const questionsData = questions.map((q: any) => ({
      ...q,
      subject: subject || "Uncategorized",
      chapter: chapter || "Uncategorized",
      topic: topic || "Uncategorized",
      isBank: true,
    }));

    await prisma.question.createMany({ data: questionsData });

    res.json({
      message: "Questions successfully added to Master Bank",
      count: questionsData.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
