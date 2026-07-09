import { Request, Response } from 'express';
import { QuestionOsService } from '../services/questionOs.service';

export class QuestionOsController {
  
  static async query(req: Request, res: Response) {
    try {
      const { filters, sort, group, columns, cursor, limit } = req.body;
      const result = await QuestionOsService.queryQuestions({
        filters,
        sort,
        group,
        columns,
        cursor,
        limit
      });
      res.json(result);
    } catch (error: any) {
      console.error('QuestionOS Query Error:', error);
      res.status(500).json({ message: 'Failed to query QuestionOS', error: error.message });
    }
  }

  static async getProperties(req: Request, res: Response) {
    try {
      // Assuming multi-tenant org if provided in token, else global
      const orgId = req.query.organizationId as string | undefined;
      const properties = await QuestionOsService.getProperties(orgId);
      res.json(properties);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch properties', error: error.message });
    }
  }

  static async createProperty(req: Request, res: Response) {
    try {
      const prop = await QuestionOsService.createProperty(req.body);
      res.status(201).json(prop);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to create property', error: error.message });
    }
  }

  static async bulkUpdate(req: Request, res: Response) {
    try {
      const { questionIds, updates } = req.body;
      if (!questionIds || !updates) {
        return res.status(400).json({ message: 'Missing questionIds or updates' });
      }
      const result = await QuestionOsService.bulkUpdate(questionIds, updates);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to bulk update questions', error: error.message });
    }
  }

  static async getViews(req: Request, res: Response) {
    try {
      // Extract userId from auth middleware
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const views = await QuestionOsService.getViews(userId);
      res.json(views);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch views', error: error.message });
    }
  }

  static async getCollections(req: Request, res: Response) {
    try {
      const collections = await QuestionOsService.getCollections();
      res.json(collections);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch collections', error: error.message });
    }
  }
}
