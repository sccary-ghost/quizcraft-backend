import prisma from "../utils/prisma";

export const updateReadingProgress = async (userId: string, chapterId: string, data: {
  paragraphId?: string;
  currentScrollPosition?: number;
  completionPercentage?: number;
}) => {
  return prisma.readingProgress.upsert({
    where: {
      userId_chapterId: {
        userId,
        chapterId,
      },
    },
    update: {
      ...data,
      lastOpenedAt: new Date(),
    },
    create: {
      userId,
      chapterId,
      ...data,
      lastOpenedAt: new Date(),
    },
  });
};

export const getReadingProgress = async (userId: string, chapterId: string) => {
  return prisma.readingProgress.findUnique({
    where: {
      userId_chapterId: { userId, chapterId },
    },
  });
};

export const logReadingHistory = async (userId: string, paragraphId: string, timeSpentMs: number) => {
  return prisma.readingHistory.create({
    data: {
      userId,
      paragraphId,
      timeSpentMs,
    },
  });
};

export const startReadingSession = async (userId: string) => {
  return prisma.readingSession.create({
    data: {
      userId,
      startedAt: new Date(),
    },
  });
};

export const endReadingSession = async (sessionId: string, data: {
  durationMs: number;
  pagesRead?: number;
  wordsRead?: number;
}) => {
  return prisma.readingSession.update({
    where: { id: sessionId },
    data: {
      ...data,
      endedAt: new Date(),
    },
  });
};
