import { Request, Response, NextFunction } from "express";
import * as vocabularyService from "../services/vocabulary.service";
import { VocabularyStatus } from "@prisma/client";

export const addWord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const word = await vocabularyService.addVocabularyWord(userId, req.body);
    res.status(201).json(word);
  } catch (error) {
    next(error);
  }
};

export const getWords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const status = req.query.status as VocabularyStatus | undefined;
    const words = await vocabularyService.getVocabularyWords(userId, status);
    res.json(words);
  } catch (error) {
    next(error);
  }
};

export const updateWordStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const word = await vocabularyService.updateVocabularyStatus(id as string, status);
    res.json(word);
  } catch (error) {
    next(error);
  }
};

export const addFlashcard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const flashcard = await vocabularyService.addFlashcard(userId, req.body);
    res.status(201).json(flashcard);
  } catch (error) {
    next(error);
  }
};

export const getFlashcards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { materialId } = req.query;
    const flashcards = await vocabularyService.getFlashcards(userId, materialId as string | undefined);
    res.json(flashcards);
  } catch (error) {
    next(error);
  }
};

export const reviewFlashcard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { result } = req.body; // boolean: true if remembered, false if forgot
    const flashcard = await vocabularyService.updateFlashcardRevision(id as string, result);
    res.json(flashcard);
  } catch (error) {
    next(error);
  }
};
