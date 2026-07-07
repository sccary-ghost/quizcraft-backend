import { getPracticeStats } from '../services/practice.service';
import prisma from '../utils/prisma';
import { PracticeSource } from '@prisma/client';

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
      (prisma.practiceSession.findMany as jest.Mock).mockResolvedValue([]);

      const stats = await getPracticeStats('user-1');

      expect(stats[PracticeSource.BOOKMARKS].totalSessions).toBe(0);
      expect(stats[PracticeSource.INCORRECT].totalSessions).toBe(0);
    });

    it('should aggregate stats properly', async () => {
      (prisma.practiceSession.findMany as jest.Mock).mockResolvedValue([
        {
          id: '1',
          userId: 'user-1',
          source: PracticeSource.BOOKMARKS,
          accuracy: 80,
          timeSpent: 120,
          completedAt: new Date()
        },
        {
          id: '2',
          userId: 'user-1',
          source: PracticeSource.BOOKMARKS,
          accuracy: 60,
          timeSpent: 80,
          completedAt: new Date(Date.now() - 10000)
        }
      ]);

      const stats = await getPracticeStats('user-1');

      expect(stats[PracticeSource.BOOKMARKS].totalSessions).toBe(2);
      expect(stats[PracticeSource.BOOKMARKS].avgAccuracy).toBe(70);
      expect(stats[PracticeSource.BOOKMARKS].avgTime).toBe(100);
      expect(stats[PracticeSource.BOOKMARKS].improvement).toBe(20);
    });
  });
});
