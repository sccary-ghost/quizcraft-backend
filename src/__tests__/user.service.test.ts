import { getCandidatesList, updateCandidateDetails } from '../services/user.service';
import prisma from '../utils/prisma';

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    attempt: {
      findMany: jest.fn(),
      count: jest.fn(),
    }
  }
}));

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCandidatesList', () => {
    it('should fetch candidates with attempt counts', async () => {
      const mockUsers = [
        { id: '1', name: 'Alice', email: 'alice@example.com', _count: { attempts: 2 } },
        { id: '2', name: 'Bob', email: 'bob@example.com', _count: { attempts: 0 } }
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const candidates = await getCandidatesList();
      
      expect(candidates.length).toBe(2);
      expect(candidates[0].name).toBe('Alice');
      expect(candidates[0].attemptsCount).toBe(2);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });

  describe('updateCandidateDetails', () => {
    it('should update candidate details successfully', async () => {
      const mockUpdatedUser = { id: '1', name: 'Alice', isActive: false };
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);
      
      const result = await updateCandidateDetails('1', { isActive: false });
      
      expect(result.isActive).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false }
      });
    });

    it('should throw error if email already exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: '2' });
      
      await expect(updateCandidateDetails('1', { email: 'exist@example.com' }))
        .rejects.toThrow('Email address already registered by another candidate');
    });
  });
});
