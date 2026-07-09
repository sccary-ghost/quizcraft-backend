import { Router } from 'express';
import { QuestionOsController } from '../controllers/questionOs.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware';

const router = Router();

// Standardize API Namespace: /api/question-os/
router.post('/query', authenticate, authorizeAdmin, QuestionOsController.query);
router.post('/bulk', authenticate, authorizeAdmin, QuestionOsController.bulkUpdate);

router.get('/properties', authenticate, authorizeAdmin, QuestionOsController.getProperties);
router.post('/properties', authenticate, authorizeAdmin, QuestionOsController.createProperty);

router.get('/views', authenticate, authorizeAdmin, QuestionOsController.getViews);
router.get('/collections', authenticate, authorizeAdmin, QuestionOsController.getCollections);

export default router;
