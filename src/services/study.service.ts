import prisma from "../utils/prisma";
import { StudyMaterialType, StudyMaterialStatus, HighlightColor, Difficulty, Language } from "@prisma/client";

export const createStudyMaterial = async (data: {
  title: string;
  description?: string;
  author?: string;
  sourceType?: StudyMaterialType;
  language?: Language;
  difficulty?: Difficulty;
  isPublic?: boolean;
}) => {
  return prisma.studyMaterial.create({
    data: {
      ...data,
      status: StudyMaterialStatus.DRAFT,
    },
  });
};

export const getStudyMaterials = async (isPublic?: boolean) => {
  return prisma.studyMaterial.findMany({
    where: isPublic !== undefined ? { isPublic } : undefined,
    include: { chapters: true },
  });
};

export const addChapter = async (materialId: string, data: {
  title: string;
  chapterOrder: number;
  htmlContent?: string;
  plainText?: string;
}) => {
  return prisma.studyChapter.create({
    data: {
      materialId,
      ...data,
    },
  });
};

export const getChapter = async (chapterId: string) => {
  return prisma.studyChapter.findUnique({
    where: { id: chapterId },
    include: { paragraphs: true },
  });
};

export const addParagraph = async (chapterId: string, data: {
  paragraphOrder: number;
  htmlContent?: string;
  plainText?: string;
}) => {
  return prisma.studyParagraph.create({
    data: {
      chapterId,
      ...data,
    },
  });
};

export const addBookmark = async (userId: string, chapterId: string, paragraphId?: string, note?: string) => {
  return prisma.studyBookmark.create({
    data: {
      userId,
      chapterId,
      paragraphId,
      note,
    },
  });
};

export const getBookmarks = async (userId: string) => {
  return prisma.studyBookmark.findMany({
    where: { userId },
    include: { user: { select: { id: true, name: true } } },
  });
};

export const addHighlight = async (userId: string, paragraphId: string, data: {
  selectedText: string;
  startOffset: number;
  endOffset: number;
  color?: HighlightColor;
}) => {
  return prisma.studyHighlight.create({
    data: {
      userId,
      paragraphId,
      ...data,
    },
  });
};

export const getHighlights = async (userId: string, paragraphId?: string) => {
  return prisma.studyHighlight.findMany({
    where: { userId, paragraphId },
  });
};
