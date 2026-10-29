import { prisma } from '../../config/database.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateBookInput, UpdateBookInput, BookQueryInput } from './books.schema.js';
import { PaginationMeta } from '../../types/index.js';
import { Prisma } from '@prisma/client';

export class BooksService {
  public static async getBooks(query: BookQueryInput): Promise<{ books: unknown[]; pagination: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.BookWhereInput = {};

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { author: { contains: s, mode: 'insensitive' } },
        { isbn: { contains: s, mode: 'insensitive' } },
        { category: { contains: s, mode: 'insensitive' } },
      ];
    } else {
      if (query.title) {
        where.title = { contains: query.title.trim(), mode: 'insensitive' };
      }
      if (query.author) {
        where.author = { contains: query.author.trim(), mode: 'insensitive' };
      }
      if (query.isbn) {
        where.isbn = { contains: query.isbn.trim(), mode: 'insensitive' };
      }
      if (query.category) {
        where.category = { equals: query.category.trim(), mode: 'insensitive' };
      }
    }

    const orderBy: Prisma.BookOrderByWithRelationInput = {
      [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
    };

    const [total, books] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          isbn: true,
          title: true,
          author: true,
          publisher: true,
          category: true,
          publicationYear: true,
          description: true,
          price: true,
          coverUrl: true,
          coverPublicId: true,
          createdAt: true,
          copies: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const formattedBooks = books.map((b) => {
      const totalCopies = b.copies.length;
      const availableCopies = b.copies.filter((c) => c.status === 'AVAILABLE').length;
      return {
        id: b.id,
        isbn: b.isbn,
        title: b.title,
        author: b.author,
        publisher: b.publisher,
        category: b.category,
        publicationYear: b.publicationYear,
        description: b.description,
        price: b.price !== undefined && b.price !== null ? Number(b.price) : 499.00,
        coverUrl: b.coverUrl,
        totalCopies,
        availableCopies,
        createdAt: b.createdAt,
      };
    });

    return {
      books: formattedBooks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getBookById(id: string) {
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        copies: {
          select: {
            id: true,
            barcode: true,
            status: true,
            shelfLocation: true,
          },
          orderBy: { barcode: 'asc' },
        },
      },
    });

    if (!book) {
      throw new NotFoundError('Book not found');
    }

    const totalCopies = book.copies.length;
    const availableCopies = book.copies.filter((c) => c.status === 'AVAILABLE').length;

    return {
      ...book,
      totalCopies,
      availableCopies,
    };
  }

  public static async createBook(
    input: CreateBookInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const book = await prisma.book.create({
      data: {
        isbn: input.isbn.trim(),
        title: input.title.trim(),
        author: input.author.trim(),
        publisher: input.publisher.trim(),
        category: input.category.trim(),
        publicationYear: input.publicationYear,
        description: input.description?.trim(),
        price: input.price !== undefined ? input.price : 499.00,
        coverUrl: input.coverUrl?.trim(),
        coverPublicId: input.coverPublicId?.trim(),
      },
    });

    await AuditService.log({
      userId,
      action: 'BOOK_CREATED',
      entityType: 'BOOK',
      entityId: book.id,
      details: { title: book.title, isbn: book.isbn },
      ipAddress,
      userAgent,
    });

    return book;
  }

  public static async updateBook(
    id: string,
    input: UpdateBookInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) {
      throw new NotFoundError('Book not found');
    }

    const updated = await prisma.book.update({
      where: { id },
      data: {
        isbn: input.isbn?.trim(),
        title: input.title?.trim(),
        author: input.author?.trim(),
        publisher: input.publisher?.trim(),
        category: input.category?.trim(),
        publicationYear: input.publicationYear,
        description: input.description?.trim(),
        price: input.price !== undefined ? input.price : undefined,
        coverUrl: input.coverUrl !== undefined ? input.coverUrl?.trim() : undefined,
        coverPublicId: input.coverPublicId !== undefined ? input.coverPublicId?.trim() : undefined,
      },
    });

    await AuditService.log({
      userId,
      action: 'BOOK_UPDATED',
      entityType: 'BOOK',
      entityId: id,
      details: { updatedFields: Object.keys(input) },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  public static async deleteBook(
    id: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        copies: {
          include: {
            _count: {
              select: {
                loans: true,
                reservations: true,
              },
            },
          },
        },
      },
    });

    if (!book) {
      throw new NotFoundError('Book not found');
    }

    const hasLoansOrReservations = book.copies.some(
      (c) => c._count.loans > 0 || c._count.reservations > 0,
    );

    if (hasLoansOrReservations) {
      throw new ConflictError(
        'Cannot delete book with existing loan records or reservation history.',
        'CANNOT_DELETE_REFERENCED_RESOURCE',
      );
    }

    await prisma.$transaction(async (tx) => {
      // Delete any physical copies first
      await tx.bookCopy.deleteMany({
        where: { bookId: id },
      });
      // Delete book
      await tx.book.delete({
        where: { id },
      });
    });

    await AuditService.log({
      userId,
      action: 'BOOK_DELETED',
      entityType: 'BOOK',
      entityId: id,
      details: { title: book.title, isbn: book.isbn },
      ipAddress,
      userAgent,
    });

    return { id };
  }
}
