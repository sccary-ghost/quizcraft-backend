import { syncSession } from '../services/sessionSync.service';
import prisma from '../utils/prisma';

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
      (prisma.attempt.findFirst as jest.Mock).mockResolvedValue({
        id: 'attempt-1',
        state: 'COMPLETED'
      });
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);

      const payload = {
        version: 1,
        clientId: 'client-1',
        currentIndex: 0,
        markedForReview: [],
        visitedQuestions: [],
        warningCount: 0,
        answers: [],
      };

      const result = await syncSession('user-1', 'attempt-1', 'attempt', payload, {});
      expect(result.status).toBe('TERMINATED');
    });
  });
});
