import * as studyService from '../services/study.service';
import prisma from '../utils/prisma';
import { StudyMaterialStatus } from '@prisma/client';

jest.mock('../utils/prisma', () => {
  return {
    __esModule: true,
    default: {
      studyMaterial: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      studyChapter: {
        create: jest.fn(),
        findUnique: jest.fn(),
      }
    }
  };
});

describe('Study Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStudyMaterial', () => {
    it('should create a study material with DRAFT status', async () => {
      const mockMaterial = {
        id: 'mat-1',
        title: 'New Book',
        status: StudyMaterialStatus.DRAFT
      };
      
      (prisma.studyMaterial.create as jest.Mock).mockResolvedValue(mockMaterial);

      const result = await studyService.createStudyMaterial({ title: 'New Book' });
      
      expect(result.title).toBe('New Book');
      expect(result.status).toBe(StudyMaterialStatus.DRAFT);
      expect(prisma.studyMaterial.create).toHaveBeenCalledWith({
        data: {
          title: 'New Book',
          status: StudyMaterialStatus.DRAFT
        }
      });
    });
  });

  describe('getStudyMaterials', () => {
    it('should fetch all public study materials', async () => {
      const mockMaterials = [
        { id: 'mat-1', title: 'Public Book', isPublic: true }
      ];
      
      (prisma.studyMaterial.findMany as jest.Mock).mockResolvedValue(mockMaterials);

      const result = await studyService.getStudyMaterials(true);
      
      expect(result.length).toBe(1);
      expect(result[0].isPublic).toBe(true);
      expect(prisma.studyMaterial.findMany).toHaveBeenCalledWith({
        where: { isPublic: true },
        include: { chapters: true }
      });
    });
  });
});
