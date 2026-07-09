import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

export class QuestionOsService {
  /**
   * Universal Query Engine for QuestionOS
   */
  static async queryQuestions(params: {
    filters?: any[];
    sort?: any[];
    group?: any[];
    columns?: string[];
    cursor?: string;
    limit?: number;
  }) {
    const { filters = [], sort = [], limit = 100, cursor } = params;

    // 1. Build Prisma Where Clause from generic filters
    const whereClause: Prisma.QuestionWhereInput = { isDeleted: false, isBank: true }; 
    
    // Simple filter builder for MVP (can be expanded for complex AND/OR logic)
    const andConditions: Prisma.QuestionWhereInput[] = [];

    filters.forEach((filter) => {
      if (filter.isCore) {
        // Native columns (e.g. subject, difficulty, topic)
        if (filter.operator === 'EQUALS') {
          andConditions.push({ [filter.field]: filter.value });
        } else if (filter.operator === 'CONTAINS') {
          andConditions.push({ [filter.field]: { contains: filter.value, mode: 'insensitive' } });
        }
      } else {
        // Custom Properties (Hybrid EAV)
        const valType = this.getValueColumnForType(filter.type);
        
        const propCondition: Prisma.QuestionWhereInput = {
          properties: {
            some: {
              property: { slug: filter.field },
            }
          }
        };

        // Inject the value check based on operator
        // @ts-ignore
        if (filter.operator === 'EQUALS') {
          // @ts-ignore
          propCondition.properties.some[valType] = filter.value;
        } else if (filter.operator === 'CONTAINS') {
          // @ts-ignore
          propCondition.properties.some[valType] = { contains: filter.value, mode: 'insensitive' };
        }
        
        andConditions.push(propCondition);
      }
    });

    if (andConditions.length > 0) {
      whereClause.AND = andConditions;
    }

    // 2. Build Prisma OrderBy
    const orderBy: Prisma.QuestionOrderByWithRelationInput[] = [];
    sort.forEach((s) => {
      if (s.isCore) {
        orderBy.push({ [s.field]: s.direction.toLowerCase() });
      } else {
        // Fallback for custom property sorting natively in Prisma.
      }
    });

    // Default sort to maintain consistent cursor pagination
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: 'desc' });
    }

    // 3. Execute Query with Virtualization/Cursor support
    const questions = await prisma.question.findMany({
      where: whereClause,
      orderBy,
      take: limit + 1, // Fetch one extra to determine hasNextPage
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
      include: {
        properties: {
          include: {
            property: true
          }
        },
        tags: true, // We should ensure tags exist or remove if they were removed
      }
    });

    let hasNextPage = false;
    let nextCursor = null;

    if (questions.length > limit) {
      hasNextPage = true;
      const nextItem = questions.pop(); // Remove the extra item
      if(nextItem) nextCursor = nextItem.id;
    }

    // Flatten properties for frontend convenience
    const formattedQuestions = questions.map((q: any) => {
      const flattened = { ...q };
      
      // Merge custom properties seamlessly
      if (q.properties) {
        q.properties.forEach((p: any) => {
          const valCol = this.getValueColumnForType(p.property.type);
          flattened[p.property.slug] = p[valCol];
        });
      }
      return flattened;
    });

    return {
      data: formattedQuestions,
      pagination: {
        hasNextPage,
        nextCursor
      }
    };
  }

  /**
   * Property Management
   */
  static async getProperties(organizationId?: string) {
    return await prisma.questionProperty.findMany({
      where: organizationId ? { organizationId } : {},
      orderBy: { displayOrder: 'asc' }
    });
  }

  static async createProperty(data: any) {
    return await prisma.questionProperty.create({
      data: {
        name: data.name,
        slug: data.slug,
        type: data.type,
        icon: data.icon || null,
        color: data.color || null,
        isCore: data.isCore || false,
        displayOrder: data.displayOrder || 0,
        options: data.options ? (data.options as any) : undefined,
        defaultValue: data.defaultValue ? (data.defaultValue as any) : undefined,
      }
    });
  }

  /**
   * Bulk Operations
   */
  static async bulkUpdate(questionIds: string[], updates: any) {
    // Separate core updates from property updates
    const coreUpdates: any = {};
    const propertyUpdates: any = {};

    // Basic heuristic: if it's not a known core field, it's a property
    const coreFields = ['subject', 'chapter', 'topic', 'difficulty', 'status', 'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation'];
    
    Object.keys(updates).forEach(key => {
      if (coreFields.includes(key)) {
        coreUpdates[key] = updates[key];
      } else {
        propertyUpdates[key] = updates[key];
      }
    });

    return await prisma.$transaction(async (tx: any) => {
      // 1. Update core fields
      if (Object.keys(coreUpdates).length > 0) {
        await tx.question.updateMany({
          where: { id: { in: questionIds } },
          data: coreUpdates
        });
      }

      // 2. Update custom properties (Upsert-like logic)
      if (Object.keys(propertyUpdates).length > 0) {
        const props = await tx.questionProperty.findMany({
          where: { slug: { in: Object.keys(propertyUpdates) } }
        });

        for (const qId of questionIds) {
          for (const prop of props) {
            const val = propertyUpdates[prop.slug];
            const valCol = this.getValueColumnForType(prop.type);
            
            // Upsert the property value
            const updateData = { [valCol]: val };
            
            const existing = await tx.questionPropertyValue.findUnique({
              where: {
                questionId_propertyId: {
                  questionId: qId,
                  propertyId: prop.id
                }
              }
            });

            if (existing) {
              await tx.questionPropertyValue.update({
                where: { id: existing.id },
                data: updateData
              });
            } else {
              await tx.questionPropertyValue.create({
                data: {
                  questionId: qId,
                  propertyId: prop.id,
                  ...updateData
                }
              });
            }
          }
        }
      }

      return { success: true, updatedCount: questionIds.length };
    });
  }

  /**
   * Views Management
   */
  static async getViews(userId: string) {
    return await prisma.questionView.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { isShared: true }
        ]
      },
      include: {
        filters: true,
        sorts: true,
        groups: true,
        layout: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Collections Management
   */
  static async getCollections() {
    return await prisma.questionCollection.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { items: true }
        }
      }
    });
  }

  // Helper
  private static getValueColumnForType(type: string): string {
    switch (type) {
      case 'NUMBER':
      case 'RATING':
        return 'numberValue';
      case 'CHECKBOX':
        return 'booleanValue';
      case 'DATE':
        return 'dateValue';
      case 'JSON':
      case 'MULTI_SELECT':
        return 'jsonValue';
      default:
        return 'textValue';
    }
  }
}
