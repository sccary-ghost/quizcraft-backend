import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { TranslationStatus, Language } from "@prisma/client";

// 1. Add/Update Translation
export const upsertTranslation = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.id as string;
    const userId = req.user!.userId;
    const { language, questionText, explanation, status, options } = req.body;

    if (!language || !questionText || !options || !Array.isArray(options)) {
      return res.status(400).json({ message: "language, questionText, and options list are required" });
    }

    // Fetch parent question
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const targetLang = language as Language;

    // Check existing translation
    const existing = await prisma.questionTranslation.findUnique({
      where: {
        questionId_language: {
          questionId,
          language: targetLang,
        },
      },
      include: { options: true, revisions: true },
    });

    let translation;

    if (existing) {
      // 1. Create a snapshot revision before updating
      const currentOptionsJson = existing.options.reduce((acc, opt) => {
        acc[opt.optionIndex] = opt.text;
        return acc;
      }, {} as Record<number, string>);

      const nextVersion = existing.revisions.length + 1;
      await prisma.translationRevision.create({
        data: {
          translationId: existing.id,
          version: nextVersion,
          questionText: existing.questionText,
          explanation: existing.explanation,
          optionsJson: currentOptionsJson,
          editedById: userId,
        },
      });

      // 2. Update existing translation fields
      translation = await prisma.questionTranslation.update({
        where: { id: existing.id },
        data: {
          questionText,
          explanation,
          status: (status as TranslationStatus) || TranslationStatus.DRAFT,
          translatedById: userId,
        },
      });

      // 3. Update options
      for (let i = 0; i < options.length; i++) {
        await prisma.questionOptionTranslation.upsert({
          where: {
            translationId_optionIndex: {
              translationId: existing.id,
              optionIndex: i,
            },
          },
          update: { text: options[i] },
          create: {
            translationId: existing.id,
            optionIndex: i,
            text: options[i],
          },
        });
      }
    } else {
      // Create new translation
      translation = await prisma.questionTranslation.create({
        data: {
          questionId,
          language: targetLang,
          questionText,
          explanation,
          status: (status as TranslationStatus) || TranslationStatus.DRAFT,
          translatedById: userId,
        },
      });

      // Create options
      for (let i = 0; i < options.length; i++) {
        await prisma.questionOptionTranslation.create({
          data: {
            translationId: translation.id,
            optionIndex: i,
            text: options[i],
          },
        });
      }
    }

    res.json({ message: "Translation updated successfully", translation });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get Translation Stats Dashboard Aggregates
export const getStats = async (req: Request, res: Response) => {
  try {
    const totalQuestions = await prisma.question.count({ where: { isDeleted: false } });
    
    // Hindi translation counts
    const hTranslations = await prisma.questionTranslation.findMany({
      where: { language: Language.HI },
    });

    const approvedCount = hTranslations.filter((t) => t.status === TranslationStatus.APPROVED).length;
    const draftCount = hTranslations.filter((t) => t.status === TranslationStatus.DRAFT || t.status === TranslationStatus.REVIEW).length;
    const missingCount = totalQuestions - hTranslations.length;

    const progressRatio = totalQuestions > 0 ? (hTranslations.length / totalQuestions) * 100 : 0;

    res.json({
      totalQuestions,
      progressRatio,
      approvedCount,
      draftCount,
      missingCount,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Export Translation CSV/JSON Template
export const exportTemplate = async (req: Request, res: Response) => {
  try {
    const questions = await prisma.question.findMany({
      where: { isDeleted: false },
      include: {
        translations: {
          where: { language: Language.HI },
          include: { options: true },
        },
      },
    });

    const templateData = questions.map((q) => {
      const hiTrans = q.translations[0];
      const hiOpts = hiTrans?.options || [];

      return {
        questionId: q.id,
        subject: q.subject || "",
        english: {
          questionText: q.question,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          explanation: q.explanation || "",
        },
        hindi: {
          questionText: hiTrans?.questionText || "",
          optionA: hiOpts.find((o) => o.optionIndex === 0)?.text || "",
          optionB: hiOpts.find((o) => o.optionIndex === 1)?.text || "",
          optionC: hiOpts.find((o) => o.optionIndex === 2)?.text || "",
          optionD: hiOpts.find((o) => o.optionIndex === 3)?.text || "",
          explanation: hiTrans?.explanation || "",
          status: hiTrans?.status || "MISSING",
        },
      };
    });

    res.json(templateData);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Bulk Import Translations
export const importTranslations = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { items } = req.body; // Expect array of formatted objects

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: "items list array is required" });
    }

    let successCount = 0;

    for (const item of items) {
      const { questionId, questionText, optionA, optionB, optionC, optionD, explanation, status } = item;
      if (!questionId || !questionText || !optionA) continue;

      // Check parent question existence
      const q = await prisma.question.findUnique({ where: { id: questionId } });
      if (!q) continue;

      const existing = await prisma.questionTranslation.findUnique({
        where: {
          questionId_language: {
            questionId,
            language: Language.HI,
          },
        },
      });

      let translationId = "";

      if (existing) {
        const trans = await prisma.questionTranslation.update({
          where: { id: existing.id },
          data: {
            questionText,
            explanation,
            status: (status as TranslationStatus) || TranslationStatus.APPROVED,
            translatedById: userId,
          },
        });
        translationId = trans.id;
      } else {
        const trans = await prisma.questionTranslation.create({
          data: {
            questionId,
            language: Language.HI,
            questionText,
            explanation,
            status: (status as TranslationStatus) || TranslationStatus.APPROVED,
            translatedById: userId,
          },
        });
        translationId = trans.id;
      }

      // Upsert options translations
      const opts = [optionA, optionB, optionC, optionD];
      for (let i = 0; i < opts.length; i++) {
        if (opts[i] === undefined || opts[i] === null) continue;
        await prisma.questionOptionTranslation.upsert({
          where: {
            translationId_optionIndex: {
              translationId,
              optionIndex: i,
            },
          },
          update: { text: opts[i] },
          create: {
            translationId,
            optionIndex: i,
            text: opts[i],
          },
        });
      }

      successCount++;
    }

    res.json({ message: `Successfully imported ${successCount} translations.` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
