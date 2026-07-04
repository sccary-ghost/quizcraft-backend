import { Router } from "express";
import prisma from "../utils/prisma";

const router = Router();

// Add single question to master question bank
router.post("/add", async (req, res) => {
  try {
    const { question, options, correctAnswer, subject, chapter, topic, explanation, tags } = req.body;

    if (!question || !options || !correctAnswer) {
      return res.status(400).json({ message: "Required fields are missing." });
    }

    const newQuestion = await prisma.question.create({
      data: {
        question,
        optionA: options.A,
        optionB: options.B,
        optionC: options.C,
        optionD: options.D,
        correctAnswer,
        subject: subject || null,
        chapter: chapter || null,
        topic: topic || null,
        explanation: explanation || null,
        tags: tags || [],
        isBank: true,
      },
    });

    res.json({
      message: "Question added successfully to Master Bank.",
      question: newQuestion,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Autocomplete meta endpoints
router.get("/meta/subjects", async (req, res) => {
  try {
    const items = await prisma.question.findMany({
      where: { isBank: true, subject: { not: null } },
      select: { subject: true },
      distinct: ["subject"],
    });
    const subjects = items.map((i) => i.subject).filter(Boolean);
    res.json(subjects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/meta/chapters", async (req, res) => {
  try {
    const items = await prisma.question.findMany({
      where: { isBank: true, chapter: { not: null } },
      select: { chapter: true },
      distinct: ["chapter"],
    });
    const chapters = items.map((i) => i.chapter).filter(Boolean);
    res.json(chapters);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/meta/topics", async (req, res) => {
  try {
    const items = await prisma.question.findMany({
      where: { isBank: true, topic: { not: null } },
      select: { topic: true },
      distinct: ["topic"],
    });
    const topics = items.map((i) => i.topic).filter(Boolean);
    res.json(topics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
