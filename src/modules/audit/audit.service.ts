import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { PaginationMeta } from '../../types/index.js';
import { Prisma } from '@prisma/client';

export interface AuditLogData {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  public static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId || null,
          details: data.details ? (data.details as Prisma.InputJsonValue) : Prisma.JsonNull,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });
    } catch (error) {
      // Audit logging should never throw and crash the application, but must log error to system logger
      logger.error('Failed to write audit log', error, { action: data.action, entityType: data.entityType });
    }
  }

  public static async getLogs(query: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }): Promise<{ logs: unknown[]; pagination: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }
    if (query.entityType) {
      where.entityType = { contains: query.entityType, mode: 'insensitive' };
    }
    if (query.from || query.to) {
      where.timestamp = {};
      if (query.from) {
        where.timestamp.gte = new Date(query.from);
      }
      if (query.to) {
        where.timestamp.lte = new Date(query.to);
      }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              registrationNumber: true,
            },
          },
        },
      }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
