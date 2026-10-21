import { prisma } from '../../config/database.js';
import {
  NotFoundError,
  ConflictError,
  BusinessRuleError,
} from '../../utils/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateBookCopyInput, UpdateBookCopyInput } from './book-copies.schema.js';
import { CopyStatus } from '../../types/index.js';

export class BookCopiesService {
  public static async getCopiesByBookId(bookId: string) {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundError('Book not found');
    }

    return prisma.bookCopy.findMany({
      where: { bookId },
      orderBy: { barcode: 'asc' },
    });
  }

  public static async getCopyById(id: string) {
    const copy = await prisma.bookCopy.findUnique({
      where: { id },
      include: {
        book: true,
        loans: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: { id: true, name: true, registrationNumber: true, email: true },
            },
          },
        },
        reservations: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: { id: true, name: true, registrationNumber: true, email: true },
            },
          },
        },
      },
    });

    if (!copy) {
      throw new NotFoundError('Book copy not found');
    }

    return copy;
  }

  public static async getCopyByBarcode(barcode: string) {
    const copy = await prisma.bookCopy.findUnique({
      where: { barcode: barcode.trim() },
      include: {
        book: true,
        loans: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: { id: true, name: true, registrationNumber: true, email: true },
            },
          },
        },
      },
    });

    if (!copy) {
      throw new NotFoundError(`Book copy with barcode '${barcode}' not found`);
    }

    return copy;
  }

  public static async createCopy(
    bookId: string,
    input: CreateBookCopyInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundError('Book not found');
    }

    const existingBarcode = await prisma.bookCopy.findUnique({
      where: { barcode: input.barcode.trim() },
    });

    if (existingBarcode) {
      throw new ConflictError(`Book copy with barcode '${input.barcode}' already exists`);
    }

    const copy = await prisma.bookCopy.create({
      data: {
        bookId,
        barcode: input.barcode.trim(),
        shelfLocation: input.shelfLocation.trim(),
        status: input.status,
      },
    });

    await AuditService.log({
      userId,
      action: 'COPY_CREATED',
      entityType: 'BOOK_COPY',
      entityId: copy.id,
      details: { barcode: copy.barcode, bookId },
      ipAddress,
      userAgent,
    });

    return copy;
  }

  public static async updateCopy(
    id: string,
    input: UpdateBookCopyInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const copy = await prisma.bookCopy.findUnique({ where: { id } });
    if (!copy) {
      throw new NotFoundError('Book copy not found');
    }

    if (input.barcode && input.barcode.trim() !== copy.barcode) {
      const existing = await prisma.bookCopy.findUnique({
        where: { barcode: input.barcode.trim() },
      });
      if (existing) {
        throw new ConflictError(`Barcode '${input.barcode}' is already in use`);
      }
    }

    // Validate status transitions
    if (input.status && input.status !== copy.status) {
      await this.validateStatusTransition(copy.id, copy.status as CopyStatus, input.status as CopyStatus);
    }

    const updated = await prisma.bookCopy.update({
      where: { id },
      data: {
        barcode: input.barcode?.trim(),
        shelfLocation: input.shelfLocation?.trim(),
        status: input.status,
      },
    });

    await AuditService.log({
      userId,
      action: 'COPY_UPDATED',
      entityType: 'BOOK_COPY',
      entityId: id,
      details: { previousStatus: copy.status, updatedFields: Object.keys(input) },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  public static async deleteCopy(
    id: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const copy = await prisma.bookCopy.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loans: true,
            reservations: true,
          },
        },
      },
    });

    if (!copy) {
      throw new NotFoundError('Book copy not found');
    }

    if (copy._count.loans > 0 || copy._count.reservations > 0) {
      throw new ConflictError(
        'Cannot delete book copy with existing borrowing or reservation history.',
        'CANNOT_DELETE_REFERENCED_RESOURCE',
      );
    }

    await prisma.bookCopy.delete({ where: { id } });

    await AuditService.log({
      userId,
      action: 'COPY_DELETED',
      entityType: 'BOOK_COPY',
      entityId: id,
      details: { barcode: copy.barcode },
      ipAddress,
      userAgent,
    });

    return { id };
  }

  private static async validateStatusTransition(
    copyId: string,
    current: CopyStatus,
    target: CopyStatus,
  ): Promise<void> {
    if (current === 'BORROWED' && target !== 'LOST') {
      const activeLoan = await prisma.loan.findFirst({
        where: { copyId, status: { in: ['ACTIVE', 'OVERDUE'] } },
      });
      if (activeLoan) {
        throw new BusinessRuleError(
          'Cannot manually change status of a borrowed copy with an active loan. Process a loan return instead.',
          'INVALID_STATUS_TRANSITION',
        );
      }
    }

    if (current === 'RESERVED' && target === 'BORROWED') {
      // Must be issued via the Loan issuance workflow
      throw new BusinessRuleError(
        'Reserved copies must be issued through the loan issuance process.',
        'INVALID_STATUS_TRANSITION',
      );
    }
  }
}
