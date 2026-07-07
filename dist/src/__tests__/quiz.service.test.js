"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const quiz_service_1 = require("../services/quiz.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
jest.mock('../utils/prisma', () => {
    const mPrisma = {
        quiz: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
        },
        attempt: {
            findFirst: jest.fn(),
            create: jest.fn(),
        }
    };
    mPrisma.$transaction = jest.fn(async (cb) => cb(mPrisma));
    return {
        __esModule: true,
        default: mPrisma
    };
});
describe('Quiz Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('createQuiz', () => {
        it('should create a quiz successfully', async () => {
            const mockQuiz = {
                id: 'quiz-123',
                title: 'Mock Quiz',
                description: 'Description',
                duration: 30,
            };
            prisma_1.default.quiz.create.mockResolvedValue(mockQuiz);
            const result = await (0, quiz_service_1.createQuiz)('Mock Quiz', 'Description', 30);
            expect(result.message).toBe('Quiz created successfully');
            expect(result.quiz.title).toBe('Mock Quiz');
            expect(prisma_1.default.quiz.create).toHaveBeenCalled();
        });
    });
    describe('getQuizById', () => {
        it('should fetch a quiz by id and filter questions based on role', async () => {
            const mockQuiz = {
                id: 'quiz-123',
                status: 'Live',
                availabilityMode: 'IMMEDIATE',
                questions: [
                    { id: 'q1', status: 'Published' },
                    { id: 'q2', status: 'Draft' }
                ]
            };
            // We also mock findMany because of updateQuizStatuses
            prisma_1.default.quiz.findMany.mockResolvedValue([]);
            prisma_1.default.quiz.findUnique.mockResolvedValue(mockQuiz);
            const result = await (0, quiz_service_1.getQuizById)('quiz-123', false);
            expect(result).toBeDefined();
            expect(result?.questions.length).toBe(1); // Non-admin gets only published
            expect(result?.questions[0].status).toBe('Published');
        });
    });
    describe('startQuizAttempt', () => {
        it('should start an attempt successfully', async () => {
            prisma_1.default.quiz.findMany.mockResolvedValue([]);
            prisma_1.default.quiz.findUnique.mockResolvedValue({
                id: 'quiz-123',
                status: 'Live',
                availabilityMode: 'IMMEDIATE'
            });
            prisma_1.default.attempt.findFirst.mockResolvedValue(null);
            prisma_1.default.attempt.create.mockResolvedValue({ id: 'attempt-123' });
            const result = await (0, quiz_service_1.startQuizAttempt)('user-1', 'quiz-123');
            expect(result.message).toBe('Attempt started successfully');
            expect(result.attemptId).toBe('attempt-123');
        });
        it('should fail if quiz is draft', async () => {
            prisma_1.default.quiz.findMany.mockResolvedValue([]);
            prisma_1.default.quiz.findUnique.mockResolvedValue({
                id: 'quiz-123',
                status: 'Draft'
            });
            await expect((0, quiz_service_1.startQuizAttempt)('user-1', 'quiz-123'))
                .rejects.toThrow('This test is currently a draft and cannot be attempted.');
        });
    });
});
