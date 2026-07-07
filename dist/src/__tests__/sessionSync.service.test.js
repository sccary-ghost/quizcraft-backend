"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sessionSync_service_1 = require("../services/sessionSync.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
jest.mock('../utils/prisma', () => ({
    __esModule: true,
    default: {
        attempt: {
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        sessionState: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        attemptSession: {
            create: jest.fn(),
            update: jest.fn(),
        },
        answer: {
            findFirst: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
        },
        question: {
            findMany: jest.fn(),
        }
    }
}));
describe('Session Sync Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('syncSession', () => {
        it('should return TERMINATED status if attempt is already completed', async () => {
            prisma_1.default.attempt.findFirst.mockResolvedValue({
                id: 'attempt-1',
                state: 'COMPLETED'
            });
            prisma_1.default.question.findMany.mockResolvedValue([]);
            const payload = {
                version: 1,
                clientId: 'client-1',
                currentIndex: 0,
                markedForReview: [],
                visitedQuestions: [],
                warningCount: 0,
                answers: [],
            };
            const result = await (0, sessionSync_service_1.syncSession)('user-1', 'attempt-1', 'attempt', payload, {});
            expect(result.status).toBe('TERMINATED');
        });
    });
});
