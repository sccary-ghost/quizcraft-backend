import { Request, Response, NextFunction } from "express";
import * as studyService from "../services/study.service";

export const createMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const material = await studyService.createStudyMaterial(req.body);
    res.status(201).json(material);
  } catch (error) {
    next(error);
  }
};

export const getMaterials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isPublic = req.query.isPublic ? req.query.isPublic === "true" : undefined;
    const materials = await studyService.getStudyMaterials(isPublic);
    res.json(materials);
  } catch (error) {
    next(error);
  }
};

export const addChapter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { materialId } = req.params;
    const chapter = await studyService.addChapter(materialId as string, req.body);
    res.status(201).json(chapter);
  } catch (error) {
    next(error);
  }
};

export const getChapter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chapterId } = req.params;
    const chapter = await studyService.getChapter(chapterId as string);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }
    res.json(chapter);
  } catch (error) {
    next(error);
  }
};

export const addParagraph = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chapterId } = req.params;
    const paragraph = await studyService.addParagraph(chapterId as string, req.body);
    res.status(201).json(paragraph);
  } catch (error) {
    next(error);
  }
};

export const addBookmark = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { chapterId, paragraphId, note } = req.body;
    const bookmark = await studyService.addBookmark(userId, chapterId, paragraphId, note);
    res.status(201).json(bookmark);
  } catch (error) {
    next(error);
  }
};

export const getBookmarks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const bookmarks = await studyService.getBookmarks(userId);
    res.json(bookmarks);
  } catch (error) {
    next(error);
  }
};

export const addHighlight = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { paragraphId } = req.params;
    const highlight = await studyService.addHighlight(userId, paragraphId as string, req.body);
    res.status(201).json(highlight);
  } catch (error) {
    next(error);
  }
};

export const getHighlights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { paragraphId } = req.query;
    const highlights = await studyService.getHighlights(userId, paragraphId as string);
    res.json(highlights);
  } catch (error) {
    next(error);
  }
};
