import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

export class ReportsService {
  public static async getCirculationReport(from?: string, to?: string) {
    const where: Prisma.LoanWhereInput = {};
    if (from || to) {
      where.issueDate = {};
      if (from) where.issueDate.gte = new Date(from);
      if (to) where.issueDate.lte = new Date(to);
    }

    const [totalIssues, activeLoans, returnedLoans, overdueLoans] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.loan.count({ where: { ...where, status: 'RETURNED' } }),
      prisma.loan.count({ where: { ...where, status: 'OVERDUE' } }),
    ]);

    return {
      period: { from: from || 'all-time', to: to || 'present' },
      summary: {
        totalIssues,
        activeLoans,
        returnedLoans,
        overdueLoans,
      },
    };
  }

  public static async getOverdueReport() {
    const overdueLoans = await prisma.loan.findMany({
      where: { status: 'OVERDUE' },
      include: {
        user: {
          select: { id: true, name: true, email: true, registrationNumber: true, phoneNumber: true },
        },
        copy: {
          include: {
            book: {
              select: { id: true, title: true, isbn: true },
            },
          },
        },
        fine: true,
      },
    });

    const affectedUserIds = new Set(overdueLoans.map((l) => l.userId));
    const affectedBookIds = new Set(overdueLoans.map((l) => l.copy.bookId));

    const totalOutstandingFines = overdueLoans.reduce((acc, l) => {
      if (l.fine && l.fine.paymentStatus === 'UNPAID') {
        return acc + Number(l.fine.amount);
      }
      return acc;
    }, 0);

    return {
      summary: {
        overdueLoansCount: overdueLoans.length,
        affectedUsersCount: affectedUserIds.size,
        affectedBooksCount: affectedBookIds.size,
        totalOutstandingOverdueFines: totalOutstandingFines,
      },
      loans: overdueLoans,
    };
  }

  public static async getFineReport(from?: string, to?: string) {
    const where: Prisma.FineWhereInput = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [totalCount, totalAgg, paidCount, paidAgg, unpaidCount, unpaidAgg] = await Promise.all([
      prisma.fine.count({ where }),
      prisma.fine.aggregate({ where, _sum: { amount: true } }),
      prisma.fine.count({ where: { ...where, paymentStatus: 'PAID' } }),
      prisma.fine.aggregate({
        where: { ...where, paymentStatus: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.fine.count({ where: { ...where, paymentStatus: 'UNPAID' } }),
      prisma.fine.aggregate({
        where: { ...where, paymentStatus: 'UNPAID' },
        _sum: { amount: true },
      }),
    ]);

    return {
      period: { from: from || 'all-time', to: to || 'present' },
      summary: {
        totalFines: totalCount,
        totalAmount: Number(totalAgg._sum.amount || 0),
        paidFines: paidCount,
        totalCollected: Number(paidAgg._sum.amount || 0),
        unpaidFines: unpaidCount,
        totalOutstanding: Number(unpaidAgg._sum.amount || 0),
      },
    };
  }

  public static async getBorrowingStatistics() {
    // Most borrowed books
    const loans = await prisma.loan.findMany({
      include: {
        copy: {
          include: {
            book: {
              select: { id: true, title: true, author: true, category: true, isbn: true },
            },
          },
        },
      },
    });

    const bookCounts: Record<
      string,
      { bookId: string; title: string; author: string; category: string; isbn: string; count: number }
    > = {};

    const categoryCounts: Record<string, number> = {};

    for (const loan of loans) {
      const book = loan.copy.book;
      if (!bookCounts[book.id]) {
        bookCounts[book.id] = {
          bookId: book.id,
          title: book.title,
          author: book.author,
          category: book.category,
          isbn: book.isbn,
          count: 0,
        };
      }
      bookCounts[book.id].count += 1;

      categoryCounts[book.category] = (categoryCounts[book.category] || 0) + 1;
    }

    const mostBorrowedBooks = Object.values(bookCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const categoryDistribution = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));

    return {
      mostBorrowedBooks,
      categoryDistribution,
      totalLoansSampled: loans.length,
    };
  }
}
