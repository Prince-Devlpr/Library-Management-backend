import { prisma } from '../../config/database.js';
import {
  NotFoundError,
  ForbiddenError,
  BusinessRuleError,
} from '../../utils/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { PaginationMeta, PaymentStatus, Role } from '../../types/index.js';
import { Prisma } from '@prisma/client';

export class FinesService {
  public static async getMyFines(
    userId: string,
    query: { page?: number; limit?: number; status?: PaymentStatus },
  ): Promise<{ fines: unknown[]; totalUnpaidAmount: number; pagination: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.FineWhereInput = {
      loan: { userId },
    };

    if (query.status) {
      where.paymentStatus = query.status;
    }

    const [total, fines, unpaidAgg] = await Promise.all([
      prisma.fine.count({ where }),
      prisma.fine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          loan: {
            include: {
              copy: {
                include: {
                  book: {
                    select: { id: true, title: true, author: true, isbn: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.fine.aggregate({
        where: {
          loan: { userId },
          paymentStatus: 'UNPAID',
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalUnpaidAmount = unpaidAgg._sum.amount ? Number(unpaidAgg._sum.amount) : 0;

    return {
      fines,
      totalUnpaidAmount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getAllFines(query: {
    page?: number;
    limit?: number;
    paymentStatus?: PaymentStatus;
    userId?: string;
  }): Promise<{ fines: unknown[]; pagination: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.FineWhereInput = {};

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }

    if (query.userId) {
      where.loan = { userId: query.userId };
    }

    const [total, fines] = await Promise.all([
      prisma.fine.count({ where }),
      prisma.fine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          loan: {
            include: {
              user: {
                select: { id: true, name: true, email: true, registrationNumber: true },
              },
              copy: {
                include: {
                  book: {
                    select: { id: true, title: true, author: true, isbn: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      fines,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getFineById(id: string, currentUserId: string, role: Role) {
    const fine = await prisma.fine.findUnique({
      where: { id },
      include: {
        loan: {
          include: {
            user: {
              select: { id: true, name: true, email: true, registrationNumber: true },
            },
            copy: {
              include: { book: true },
            },
          },
        },
      },
    });

    if (!fine) {
      throw new NotFoundError('Fine record not found');
    }

    if (role === 'USER' && fine.loan.userId !== currentUserId) {
      throw new ForbiddenError('Cannot access another user\'s fine record');
    }

    return fine;
  }

  public static async markFineAsPaid(
    id: string,
    staffUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const fine = await prisma.fine.findUnique({
      where: { id },
      include: {
        loan: {
          include: {
            copy: { include: { book: true } },
          },
        },
      },
    });

    if (!fine) {
      throw new NotFoundError('Fine record not found');
    }

    if (fine.paymentStatus === 'PAID') {
      throw new BusinessRuleError('This fine has already been marked as paid', 'FINE_ALREADY_PAID');
    }

    const paymentDate = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      return tx.fine.update({
        where: { id },
        data: {
          paymentStatus: 'PAID',
          paymentDate,
        },
      });
    });

    await NotificationService.createNotification({
      userId: fine.loan.userId,
      message: `Fine of $${fine.amount} for "${fine.loan.copy.book.title}" was marked as paid.`,
      type: 'GENERAL',
    });

    await AuditService.log({
      userId: staffUserId,
      action: 'FINE_PAID',
      entityType: 'FINE',
      entityId: id,
      details: {
        loanId: fine.loanId,
        amount: Number(fine.amount),
        patronId: fine.loan.userId,
        paymentDate,
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }
}
