"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionOsController = void 0;
const questionOs_service_1 = require("../services/questionOs.service");
class QuestionOsController {
    static async query(req, res) {
        try {
            const { filters, sort, group, columns, cursor, limit } = req.body;
            const result = await questionOs_service_1.QuestionOsService.queryQuestions({
                filters,
                sort,
                group,
                columns,
                cursor,
                limit
            });
            res.json(result);
        }
        catch (error) {
            console.error('QuestionOS Query Error:', error);
            res.status(500).json({ message: 'Failed to query QuestionOS', error: error.message });
        }
    }
    static async getProperties(req, res) {
        try {
            // Assuming multi-tenant org if provided in token, else global
            const orgId = req.query.organizationId;
            const properties = await questionOs_service_1.QuestionOsService.getProperties(orgId);
            res.json(properties);
        }
        catch (error) {
            res.status(500).json({ message: 'Failed to fetch properties', error: error.message });
        }
    }
    static async createProperty(req, res) {
        try {
            const prop = await questionOs_service_1.QuestionOsService.createProperty(req.body);
            res.status(201).json(prop);
        }
        catch (error) {
            res.status(500).json({ message: 'Failed to create property', error: error.message });
        }
    }
    static async bulkUpdate(req, res) {
        try {
            const { questionIds, updates } = req.body;
            if (!questionIds || !updates) {
                return res.status(400).json({ message: 'Missing questionIds or updates' });
            }
            const result = await questionOs_service_1.QuestionOsService.bulkUpdate(questionIds, updates);
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ message: 'Failed to bulk update questions', error: error.message });
        }
    }
    static async getViews(req, res) {
        try {
            // Extract userId from auth middleware
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            const views = await questionOs_service_1.QuestionOsService.getViews(userId);
            res.json(views);
        }
        catch (error) {
            res.status(500).json({ message: 'Failed to fetch views', error: error.message });
        }
    }
    static async getCollections(req, res) {
        try {
            const collections = await questionOs_service_1.QuestionOsService.getCollections();
            res.json(collections);
        }
        catch (error) {
            res.status(500).json({ message: 'Failed to fetch collections', error: error.message });
        }
    }
}
exports.QuestionOsController = QuestionOsController;
