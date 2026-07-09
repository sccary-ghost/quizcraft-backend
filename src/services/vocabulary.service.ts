import prisma from "../utils/prisma";
import { VocabularyStatus, Difficulty } from "@prisma/client";

export const addVocabularyWord = async (userId: string, data: {
  word: string;
  meaning: string;
  partOfSpeech?: string;
  pronunciation?: string;
  ipa?: string;
  hindiMeaning?: string;
  synonyms?: string[];
  antonyms?: string[];
  examples?: string[];
  difficulty?: Difficulty;
}) => {
  return prisma.vocabularyWord.upsert({
    where: {
      userId_word: {
        userId,
        word: data.word,
      },
    },
    update: data,
    create: {
      userId,
      ...data,
    },
  });
};

export const getVocabularyWords = async (userId: string, status?: VocabularyStatus) => {
  return prisma.vocabularyWord.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
  });
};

export const updateVocabularyStatus = async (id: string, status: VocabularyStatus) => {
  return prisma.vocabularyWord.update({
    where: { id },
    data: { status },
  });
};

export const addFlashcard = async (userId: string, data: { front: string; back: string; materialId?: string }) => {
  return prisma.flashcard.create({
    data: {
      userId,
      ...data,
    },
  });
};

export const getFlashcards = async (userId: string, materialId?: string) => {
  return prisma.flashcard.findMany({
    where: {
      userId,
      ...(materialId ? { materialId } : {}),
    },
  });
};

export const updateFlashcardRevision = async (id: string, result: boolean) => {
  const flashcard = await prisma.flashcard.findUnique({ where: { id } });
  if (!flashcard) throw new Error("Flashcard not found");

  const newRevisionCount = flashcard.revisionCount + 1;
  const nextDate = new Date();
  if (result) {
    nextDate.setDate(nextDate.getDate() + newRevisionCount * 2);
  } else {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return prisma.flashcard.update({
    where: { id },
    data: {
      lastRevisionResult: result,
      lastRevisionAt: new Date(),
      revisionCount: newRevisionCount,
      nextRevisionDate: nextDate,
    },
  });
};
