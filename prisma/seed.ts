import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function hash(pw: string): Promise<string> {
  return argon2.hash(pw, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

async function main() {
  console.log('Seeding database with realistic development data...');

  // Clear existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.fine.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.session.deleteMany();
  await prisma.libraryPolicy.deleteMany();
  await prisma.bookCopy.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!';
  const librarianPassword = process.env.SEED_LIBRARIAN_PASSWORD || 'LibrarianPassword123!';
  const userPassword = process.env.SEED_USER_PASSWORD || 'UserPassword123!';

  const adminHash = await hash(adminPassword);
  const librarianHash = await hash(librarianPassword);
  const userHash = await hash(userPassword);

  // 1. Users
  const admin = await prisma.user.create({
    data: {
      registrationNumber: 'ADM-001',
      name: 'System Administrator',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@library.local',
      phoneNumber: '+1-555-0100',
      passwordHash: adminHash,
      role: 'ADMINISTRATOR',
      status: 'ACTIVE',
    },
  });

  const librarian1 = await prisma.user.create({
    data: {
      registrationNumber: 'LIB-001',
      name: 'Eleanor Vance',
      email: 'librarian1@library.local',
      phoneNumber: '+1-555-0101',
      passwordHash: librarianHash,
      role: 'LIBRARIAN',
      status: 'ACTIVE',
    },
  });

  await prisma.user.create({
    data: {
      registrationNumber: 'LIB-002',
      name: 'Marcus Brody',
      email: 'librarian2@library.local',
      phoneNumber: '+1-555-0102',
      passwordHash: librarianHash,
      role: 'LIBRARIAN',
      status: 'ACTIVE',
    },
  });

  const alice = await prisma.user.create({
    data: {
      registrationNumber: 'USR-1001',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phoneNumber: '+1-555-0201',
      passwordHash: userHash,
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  const bob = await prisma.user.create({
    data: {
      registrationNumber: 'USR-1002',
      name: 'Bob Smith',
      email: 'bob@example.com',
      phoneNumber: '+1-555-0202',
      passwordHash: userHash,
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  await prisma.user.create({
    data: {
      registrationNumber: 'USR-1003',
      name: 'Charlie Inactive',
      email: 'charlie@example.com',
      phoneNumber: '+1-555-0203',
      passwordHash: userHash,
      role: 'USER',
      status: 'INACTIVE',
    },
  });

  console.log('Seeded Users: 1 Admin, 2 Librarians, 3 Patrons (1 Inactive)');

  // 2. Library Policy
  await prisma.libraryPolicy.create({
    data: {
      borrowLimit: 3,
      loanDuration: 14,
      reservationPeriod: 3,
      finePerDay: 1.0,
      maxRenewals: 2,
      updatedBy: admin.id,
    },
  });
  console.log('Seeded Library Policy');

  // 3. Books
  const cleanCode = await prisma.book.create({
    data: {
      isbn: '978-0132350884',
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      author: 'Robert C. Martin',
      publisher: 'Prentice Hall',
      category: 'Software Engineering',
      publicationYear: 2008,
      description: 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees.',
    },
  });

  const designPatterns = await prisma.book.create({
    data: {
      isbn: '978-0201633610',
      title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
      publisher: 'Addison-Wesley',
      category: 'Computer Science',
      publicationYear: 1994,
      description: 'Captures a wealth of experience about the design of object-oriented software by four top-notch designers.',
    },
  });

  const ddia = await prisma.book.create({
    data: {
      isbn: '978-1449373320',
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      publisher: "O'Reilly Media",
      category: 'Data Engineering',
      publicationYear: 2017,
      description: 'The big ideas behind reliable, scalable, and maintainable systems.',
    },
  });

  const pragmatic = await prisma.book.create({
    data: {
      isbn: '978-0135957059',
      title: 'The Pragmatic Programmer: Your Journey To Mastery',
      author: 'David Thomas, Andrew Hunt',
      publisher: 'Addison-Wesley',
      category: 'Software Engineering',
      publicationYear: 2019,
      description: 'Illustrates the best practices and major pitfalls of many different aspects of software development.',
    },
  });

  const algorithms = await prisma.book.create({
    data: {
      isbn: '978-0262046305',
      title: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
      publisher: 'MIT Press',
      category: 'Algorithms',
      publicationYear: 2022,
      description: 'A comprehensive textbook covering the modern study of computer algorithms.',
    },
  });

  console.log('Seeded Books: 5 titles');

  // 4. Book Copies
  const ccCopy1 = await prisma.bookCopy.create({
    data: { bookId: cleanCode.id, barcode: 'CC-001', status: 'AVAILABLE', shelfLocation: 'A1-01' },
  });
  const ccCopy2 = await prisma.bookCopy.create({
    data: { bookId: cleanCode.id, barcode: 'CC-002', status: 'BORROWED', shelfLocation: 'A1-02' },
  });
  const ccCopy3 = await prisma.bookCopy.create({
    data: { bookId: cleanCode.id, barcode: 'CC-003', status: 'RESERVED', shelfLocation: 'A1-03' },
  });

  const dpCopy1 = await prisma.bookCopy.create({
    data: { bookId: designPatterns.id, barcode: 'DP-001', status: 'AVAILABLE', shelfLocation: 'B2-01' },
  });
  const dpCopy2 = await prisma.bookCopy.create({
    data: { bookId: designPatterns.id, barcode: 'DP-002', status: 'BORROWED', shelfLocation: 'B2-02' },
  });

  await prisma.bookCopy.create({
    data: { bookId: ddia.id, barcode: 'DDIA-001', status: 'AVAILABLE', shelfLocation: 'C3-01' },
  });
  await prisma.bookCopy.create({
    data: { bookId: ddia.id, barcode: 'DDIA-002', status: 'LOST', shelfLocation: 'C3-02' },
  });

  await prisma.bookCopy.create({
    data: { bookId: pragmatic.id, barcode: 'PP-001', status: 'AVAILABLE', shelfLocation: 'D4-01' },
  });
  await prisma.bookCopy.create({
    data: { bookId: algorithms.id, barcode: 'ALGO-001', status: 'AVAILABLE', shelfLocation: 'E5-01' },
  });

  console.log('Seeded Book Copies: 9 copies across multiple statuses');

  // 5. Loans
  // Active normal loan for Alice
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const twelveDaysAhead = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);

  await prisma.loan.create({
    data: {
      userId: alice.id,
      copyId: ccCopy2.id,
      issueDate: twoDaysAgo,
      dueDate: twelveDaysAhead,
      status: 'ACTIVE',
      renewalCount: 0,
    },
  });

  // Overdue loan for Alice (issued 20 days ago, due 6 days ago)
  const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

  const overdueLoan = await prisma.loan.create({
    data: {
      userId: alice.id,
      copyId: dpCopy2.id,
      issueDate: twentyDaysAgo,
      dueDate: sixDaysAgo,
      status: 'OVERDUE',
      renewalCount: 0,
    },
  });

  // Fine for overdue loan (6 days * $1.00 = $6.00)
  await prisma.fine.create({
    data: {
      loanId: overdueLoan.id,
      amount: 6.0,
      paymentStatus: 'UNPAID',
    },
  });

  // Historical returned loan for Bob
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixteenDaysAgo = new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000);
  const twentyTwoDaysAgo = new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000);

  await prisma.loan.create({
    data: {
      userId: bob.id,
      copyId: dpCopy1.id,
      issueDate: thirtyDaysAgo,
      dueDate: sixteenDaysAgo,
      returnDate: twentyTwoDaysAgo,
      status: 'RETURNED',
      renewalCount: 0,
    },
  });

  console.log('Seeded Loans and Fines');

  // 6. Reservations
  const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  await prisma.reservation.create({
    data: {
      userId: bob.id,
      copyId: ccCopy3.id,
      reservationDate: now,
      expiryDate: threeDaysAhead,
      status: 'ACTIVE',
    },
  });
  console.log('Seeded Reservation');

  // 7. Notifications
  await prisma.notification.create({
    data: {
      userId: bob.id,
      message: "Your reservation for 'Clean Code' has been confirmed. Expiry: 3 days.",
      type: 'RESERVATION_CONFIRMED',
      status: 'UNREAD',
    },
  });

  await prisma.notification.create({
    data: {
      userId: alice.id,
      message: "Loan for 'Design Patterns' is overdue! Please return it to avoid additional daily fines.",
      type: 'OVERDUE',
      status: 'UNREAD',
    },
  });

  // 8. Audit Log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'SYSTEM',
      details: { seededAt: now.toISOString(), version: '1.0.0' },
      ipAddress: '127.0.0.1',
      userAgent: 'SeedScript/1.0',
    },
  });

  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
