import { prisma } from '../../config/database.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BusinessRuleError,
} from '../../utils/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { PoliciesService } from '../policies/policies.service.js';
import { IssueLoanInput, ReturnLoanInput } from './loans.schema.js';
import { PaginationMeta, Role } from '../../types/index.js';
import { Prisma, Fine } from '@prisma/client';

export class LoansService {
  public static async issueBook(
    librarianId: string,
    input: IssueLoanInput,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('User account is inactive', 'USER_INACTIVE');
    }

    const policy = await PoliciesService.getPolicy();

    // Count active loans
    const activeLoansCount = await prisma.loan.count({
      where: {
        userId: user.id,
        status: { in: ['ACTIVE', 'OVERDUE'] },
      },
    });

    if (activeLoansCount >= policy.borrowLimit) {
      throw new BusinessRuleError(
        `Borrow limit reached. User already has ${activeLoansCount} active loans (limit is ${policy.borrowLimit}).`,
        'BORROW_LIMIT_REACHED',
      );
    }

    // Find copy by barcode
    const copy = await prisma.bookCopy.findUnique({
      where: { barcode: input.barcode.trim() },
      include: {
        book: true,
        reservations: {
          where: { status: 'ACTIVE' },
          orderBy: { reservationDate: 'asc' },
        },
      },
    });

    if (!copy) {
      throw new NotFoundError(
        `Book copy with barcode '${input.barcode}' not found`,
        'BOOK_COPY_NOT_FOUND',
      );
    }

    // Check if copy is legal to issue based on initial read
    if (copy.status !== 'AVAILABLE' && copy.status !== 'RESERVED') {
      throw new ConflictError(
        `Book copy is currently ${copy.status.toLowerCase()} and cannot be issued.`,
        'BOOK_COPY_UNAVAILABLE',
      );
    }

    const now = new Date();
    const dueDate = new Date(now.getTime() + policy.loanDuration * 24 * 60 * 60 * 1000);

    // Transaction with strict conditional updates and reservation verification
    const loan = await prisma.$transaction(async (tx) => {
      // 1. Check for any active reservation on this copy inside the transaction
      const activeReservation = await tx.reservation.findFirst({
        where: {
          copyId: copy.id,
          status: 'ACTIVE',
        },
        orderBy: { reservationDate: 'asc' },
      });

      if (activeReservation) {
        // Dual-layer lazy expiration check: If 24h deadline has passed, expire and reject
        if (now > new Date(activeReservation.expiryDate)) {
          await tx.reservation.update({
            where: { id: activeReservation.id },
            data: { status: 'EXPIRED' },
          });

          await tx.bookCopy.updateMany({
            where: { id: copy.id, status: 'RESERVED' },
            data: { status: 'AVAILABLE' },
          });

          throw new BusinessRuleError(
            'The reservation for this copy has expired (past 24-hour collection deadline) and cannot be issued.',
            'RESERVATION_EXPIRED',
          );
        }

        // A reserved copy must only be issued to its reservation owner
        if (activeReservation.userId !== user.id) {
          throw new ConflictError(
            'This copy is currently reserved by another patron.',
            'BOOK_COPY_UNAVAILABLE',
          );
        }

        // Atomically transition copy from RESERVED to BORROWED
        const copyUpdate = await tx.bookCopy.updateMany({
          where: {
            id: copy.id,
            status: 'RESERVED',
          },
          data: { status: 'BORROWED' },
        });

        if (copyUpdate.count === 0) {
          throw new ConflictError(
            'The selected book copy is not available.',
            'BOOK_COPY_UNAVAILABLE',
          );
        }

        // Atomically transition reservation to COLLECTED
        const resUpdate = await tx.reservation.updateMany({
          where: {
            id: activeReservation.id,
            status: 'ACTIVE',
          },
          data: { status: 'COLLECTED' },
        });

        if (resUpdate.count === 0) {
          throw new ConflictError(
            'The reservation is no longer active.',
            'BOOK_COPY_UNAVAILABLE',
          );
        }
      } else {
        // No active reservation exists on this copy
        // Inconsistent/stale check: If copy status is RESERVED without an active reservation, reject
        const currentCopy = await tx.bookCopy.findUnique({
          where: { id: copy.id },
          select: { status: true },
        });

        if (currentCopy?.status === 'RESERVED') {
          throw new ConflictError(
            'This copy is marked as reserved with no active reservation on file and cannot be issued.',
            'BOOK_COPY_UNAVAILABLE',
          );
        }

        // For unreserved patrons, only transition from AVAILABLE to BORROWED
        const copyUpdate = await tx.bookCopy.updateMany({
          where: {
            id: copy.id,
            status: 'AVAILABLE',
          },
          data: { status: 'BORROWED' },
        });

        if (copyUpdate.count === 0) {
          throw new ConflictError(
            'The selected book copy is not available.',
            'BOOK_COPY_UNAVAILABLE',
          );
        }
      }

      const createdLoan = await tx.loan.create({
        data: {
          userId: user.id,
          copyId: copy.id,
          issuedById: librarianId,
          issueDate: now,
          dueDate,
          status: 'ACTIVE',
          renewalCount: 0,
        },
        include: {
          copy: {
            include: { book: true },
          },
          user: {
            select: { id: true, name: true, email: true, registrationNumber: true },
          },
        },
      });

      return createdLoan;
    });

    await NotificationService.createNotification({
      userId: user.id,
      message: `You have borrowed "${copy.book.title}". Due date: ${dueDate.toLocaleDateString()}.`,
      type: 'GENERAL',
    });

    await AuditService.log({
      userId: librarianId,
      action: 'LOAN_ISSUED',
      entityType: 'LOAN',
      entityId: loan.id,
      details: {
        userId: user.id,
        copyId: copy.id,
        barcode: copy.barcode,
        dueDate,
      },
      ipAddress,
      userAgent,
    });

    return loan;
  }

  public static async returnBook(
    librarianId: string,
    input: ReturnLoanInput,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const copy = await prisma.bookCopy.findUnique({
      where: { barcode: input.barcode.trim() },
      include: { book: true },
    });

    if (!copy) {
      throw new NotFoundError(
        `Book copy with barcode '${input.barcode}' not found`,
        'BOOK_COPY_NOT_FOUND',
      );
    }

    const loan = await prisma.loan.findFirst({
      where: {
        copyId: copy.id,
        status: { in: ['ACTIVE', 'OVERDUE'] },
      },
      include: {
        user: true,
        fine: true,
      },
    });

    if (!loan) {
      throw new NotFoundError(
        `No active loan found for book copy barcode '${input.barcode}'`,
        'LOAN_NOT_FOUND',
      );
    }

    const returnDate = new Date();
    const policy = await PoliciesService.getPolicy();

    // Real-time overdue calculation
    const dueTime = new Date(loan.dueDate).getTime();
    const returnTime = returnDate.getTime();
    const overdueMs = returnTime - dueTime;
    const overdueDays = overdueMs > 0 ? Math.floor(overdueMs / (1000 * 60 * 60 * 24)) : 0;

    let fineCreated: Fine | null = null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark loan as RETURNED
      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          returnDate,
          returnedById: librarianId,
          status: 'RETURNED',
        },
      });

      // 2. Mark copy as AVAILABLE
      await tx.bookCopy.update({
        where: { id: copy.id },
        data: { status: 'AVAILABLE' },
      });

      // 3. If overdue and fine doesn't exist yet, create fine with paise
      if (overdueDays > 0 && !loan.fine) {
        const fineAmount = new Prisma.Decimal(overdueDays).mul(policy.finePerDay);
        const amountPaise = Math.round(Number(fineAmount) * 100);
        fineCreated = await tx.fine.create({
          data: {
            loanId: loan.id,
            amount: fineAmount,
            amountPaise,
            paymentStatus: 'UNPAID',
          },
        });
      }

      return { updatedLoan, fine: fineCreated || loan.fine };
    });

    if (overdueDays > 0) {
      await NotificationService.createNotification({
        userId: loan.userId,
        message: `Book "${copy.book.title}" was returned ${overdueDays} day(s) late. An overdue fine has been applied.`,
        type: 'OVERDUE',
      });
    } else {
      await NotificationService.createNotification({
        userId: loan.userId,
        message: `Book "${copy.book.title}" was successfully returned on time. Thank you!`,
        type: 'GENERAL',
      });
    }

    await AuditService.log({
      userId: librarianId,
      action: 'LOAN_RETURNED',
      entityType: 'LOAN',
      entityId: loan.id,
      details: {
        barcode: copy.barcode,
        overdueDays,
        fineGenerated: !!fineCreated,
      },
      ipAddress,
      userAgent,
    });

    return {
      loanId: loan.id,
      barcode: copy.barcode,
      bookTitle: copy.book.title,
      returnDate,
      overdueDays,
      fine: result.fine,
    };
  }

  public static async renewLoan(
    loanId: string,
    currentUserId: string,
    role: Role,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        copy: { include: { book: true } },
        user: true,
      },
    });

    if (!loan) {
      throw new NotFoundError('Loan not found', 'LOAN_NOT_FOUND');
    }

    if (role === 'USER' && loan.userId !== currentUserId) {
      throw new ForbiddenError('You can only renew your own loans', 'UNAUTHORIZED_RENEWAL');
    }

    if (loan.status !== 'ACTIVE') {
      throw new BusinessRuleError(
        `Cannot renew a loan with status '${loan.status}'. Only active loans can be renewed.`,
        'LOAN_NOT_ACTIVE',
      );
    }

    if (loan.user.status !== 'ACTIVE') {
      throw new ForbiddenError('Inactive user accounts cannot renew loans', 'ACCOUNT_INACTIVE');
    }

    const policy = await PoliciesService.getPolicy();

    // Check renewal limit
    if (loan.renewalCount >= policy.maxRenewals) {
      throw new BusinessRuleError(
        `Loan has reached the maximum permitted renewals limit of ${policy.maxRenewals}.`,
        'MAX_RENEWALS_REACHED',
      );
    }

    // Check active reservations on this book copy by other users
    const activeReservation = await prisma.reservation.findFirst({
      where: {
        copyId: loan.copyId,
        status: 'ACTIVE',
        userId: { not: loan.userId },
      },
    });

    if (activeReservation) {
      throw new ConflictError(
        'Cannot renew this loan: another patron has placed a reservation on this book.',
        'RENEWAL_BLOCKED_BY_RESERVATION',
      );
    }

    // Transaction to update due date and increment renewal count
    const newDueDate = new Date(
      new Date(loan.dueDate).getTime() + policy.loanDuration * 24 * 60 * 60 * 1000,
    );

    const updated = await prisma.$transaction(async (tx) => {
      return tx.loan.update({
        where: { id: loanId },
        data: {
          dueDate: newDueDate,
          renewalCount: { increment: 1 },
        },
        include: {
          copy: { include: { book: true } },
        },
      });
    });

    await NotificationService.createNotification({
      userId: loan.userId,
      message: `Your loan for "${loan.copy.book.title}" has been renewed. New due date: ${newDueDate.toLocaleDateString()}.`,
      type: 'GENERAL',
    });

    await AuditService.log({
      userId: currentUserId,
      action: 'LOAN_RENEWED',
      entityType: 'LOAN',
      entityId: loanId,
      details: {
        newDueDate,
        renewalCount: updated.renewalCount,
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  public static async getMyActiveLoans(userId: string) {
    return prisma.loan.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'OVERDUE'] },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        copy: {
          include: {
            book: {
              select: { id: true, title: true, author: true, isbn: true, category: true },
            },
          },
        },
        fine: true,
      },
    });
  }

  public static async getMyLoanHistory(
    userId: string,
    query: { page?: number; limit?: number },
  ): Promise<{ loans: unknown[]; pagination: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const [total, loans] = await Promise.all([
      prisma.loan.count({ where: { userId } }),
      prisma.loan.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: {
          copy: {
            include: {
              book: {
                select: { id: true, title: true, author: true, isbn: true },
              },
            },
          },
          fine: true,
        },
      }),
    ]);

    return {
      loans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getLoanById(loanId: string, currentUserId: string, role: Role) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        copy: {
          include: { book: true },
        },
        user: {
          select: { id: true, name: true, email: true, registrationNumber: true },
        },
        fine: true,
      },
    });

    if (!loan) {
      throw new NotFoundError('Loan not found', 'LOAN_NOT_FOUND');
    }

    if (role === 'USER' && loan.userId !== currentUserId) {
      throw new ForbiddenError('Cannot view another user\'s loan record');
    }

    return loan;
  }

  public static async updateOverdueStatuses(): Promise<{ updatedCount: number }> {
    const now = new Date();
    const result = await prisma.loan.updateMany({
      where: {
        status: 'ACTIVE',
        dueDate: { lt: now },
      },
      data: {
        status: 'OVERDUE',
      },
    });

    return { updatedCount: result.count };
  }

  public static async getOverdueLoans(query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.LoanWhereInput = {
      status: 'OVERDUE',
    };

    const [total, loans] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, registrationNumber: true, phoneNumber: true },
          },
          copy: {
            include: { book: true },
          },
          fine: true,
        },
      }),
    ]);

    return {
      loans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
