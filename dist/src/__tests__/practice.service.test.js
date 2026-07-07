"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const practice_service_1 = require("../services/practice.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
jest.mock('../utils/prisma', () => ({
    __esModule: true,
    default: {
        practiceSession: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
        practiceSessionQuestion: {
            createMany: jest.fn(),
        },
        bookmark: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
        answer: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
        question: {
            findMany: jest.fn(),
        }
    }
}));
describe('Practice Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getPracticeStats', () => {
        it('should return empty stats if no sessions exist', async () => {
            prisma_1.default.practiceSession.findMany.mockResolvedValue([]);
            const stats = await (0, practice_service_1.getPracticeStats)('user-1');
            expect(stats[client_1.PracticeSource.BOOKMARKS].totalSessions).toBe(0);
            expect(stats[client_1.PracticeSource.INCORRECT].totalSessions).toBe(0);
        });
        it('should aggregate stats properly', async () => {
            prisma_1.default.practiceSession.findMany.mockResolvedValue([
                {
                    id: '1',
                    userId: 'user-1',
                    source: client_1.PracticeSource.BOOKMARKS,
                    accuracy: 80,
                    timeSpent: 120,
                    completedAt: new Date()
                },
                {
                    id: '2',
                    userId: 'user-1',
                    source: client_1.PracticeSource.BOOKMARKS,
                    accuracy: 60,
                    timeSpent: 80,
                    completedAt: new Date(Date.now() - 10000)
                }
            ]);
            const stats = await (0, practice_service_1.getPracticeStats)('user-1');
            expect(stats[client_1.PracticeSource.BOOKMARKS].totalSessions).toBe(2);
            expect(stats[client_1.PracticeSource.BOOKMARKS].avgAccuracy).toBe(70);
            expect(stats[client_1.PracticeSource.BOOKMARKS].avgTime).toBe(100);
            expect(stats[client_1.PracticeSource.BOOKMARKS].improvement).toBe(20);
        });
    });
});
