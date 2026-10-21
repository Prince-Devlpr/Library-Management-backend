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
  console.log('--- Seeding Library Management System with rich catalog & default accounts ---');

  // Clear existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.fine.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.session.deleteMany();
  await prisma.libraryPolicy.deleteMany();
  await prisma.bookCopy.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  // Password Hashes
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
  const librarianPassword = process.env.SEED_LIBRARIAN_PASSWORD || 'Librarian@123';
  const memberPassword = process.env.SEED_USER_PASSWORD || 'Member@123';

  const adminHash = await hash(adminPassword);
  const librarianHash = await hash(librarianPassword);
  const memberHash = await hash(memberPassword);

  // 1. Administrator Account
  const admin = await prisma.user.create({
    data: {
      registrationNumber: 'ADM-001',
      name: 'System Administrator',
      email: 'admin@library.com',
      phoneNumber: '+1-555-0100',
      passwordHash: adminHash,
      role: 'ADMINISTRATOR',
      status: 'ACTIVE',
      cardQrToken: 'adm_master_admin_token',
    },
  });

  // Secondary legacy admin for backward compatibility with .env SEED_ADMIN_EMAIL
  if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_EMAIL !== 'admin@library.com') {
    await prisma.user.create({
      data: {
        registrationNumber: 'ADM-002',
        name: 'Legacy Admin',
        email: process.env.SEED_ADMIN_EMAIL,
        phoneNumber: '+1-555-0199',
        passwordHash: adminHash,
        role: 'ADMINISTRATOR',
        status: 'ACTIVE',
      },
    });
  }

  // 2. Librarian Accounts
  const librarian = await prisma.user.create({
    data: {
      registrationNumber: 'LIB-001',
      name: 'Eleanor Vance (Chief Librarian)',
      email: 'librarian@library.com',
      phoneNumber: '+1-555-0101',
      passwordHash: librarianHash,
      role: 'LIBRARIAN',
      status: 'ACTIVE',
      cardQrToken: 'lib_chief_librarian_token',
    },
  });

  await prisma.user.create({
    data: {
      registrationNumber: 'LIB-002',
      name: 'Marcus Brody',
      email: 'librarian2@library.com',
      phoneNumber: '+1-555-0102',
      passwordHash: librarianHash,
      role: 'LIBRARIAN',
      status: 'ACTIVE',
    },
  });

  // 3. Member Accounts
  const member = await prisma.user.create({
    data: {
      registrationNumber: 'MEM-2026-001',
      name: 'Alex Rivera',
      email: 'member@library.com',
      phoneNumber: '+1-555-0201',
      passwordHash: memberHash,
      role: 'USER',
      status: 'ACTIVE',
      cardQrToken: 'mem_98a7c2b6f103e5a4', // Matches the live scanner test QR!
    },
  });

  const alice = await prisma.user.create({
    data: {
      registrationNumber: 'USR-1001',
      name: 'Alice Johnson',
      email: 'alice@library.com',
      phoneNumber: '+1-555-0202',
      passwordHash: memberHash,
      role: 'USER',
      status: 'ACTIVE',
      cardQrToken: 'mem_alice_johnson_token',
    },
  });

  const bob = await prisma.user.create({
    data: {
      registrationNumber: 'USR-1002',
      name: 'Bob Smith',
      email: 'bob@library.com',
      phoneNumber: '+1-555-0203',
      passwordHash: memberHash,
      role: 'USER',
      status: 'ACTIVE',
      cardQrToken: 'mem_bob_smith_token',
    },
  });

  // 4. Library Policy
  await prisma.libraryPolicy.create({
    data: {
      borrowLimit: 5,
      loanDuration: 14,
      reservationPeriod: 1, // 24-hour pickup hold
      finePerDay: 5.0,
      maxRenewals: 2,
      updatedBy: admin.id,
    },
  });

  // 5. Books with High-Quality Online Cover Images (OpenLibrary ISBN Large CDN & Curated Unsplash)
  const booksData = [
    {
      isbn: '978-0132350884',
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      author: 'Robert C. Martin',
      publisher: 'Prentice Hall',
      category: 'Software Engineering',
      publicationYear: 2008,
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',
      description: 'Even bad code can function. But if code isn’t clean, it can bring a development organization to its knees.',
      copies: [
        { barcode: 'CC-001', status: 'AVAILABLE', shelfLocation: 'CS-A1-01' },
        { barcode: 'CC-002', status: 'BORROWED', shelfLocation: 'CS-A1-02' },
        { barcode: 'CC-003', status: 'RESERVED', shelfLocation: 'CS-A1-03' },
      ],
    },
    {
      isbn: '978-0201633610',
      title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
      publisher: 'Addison-Wesley',
      category: 'Computer Science',
      publicationYear: 1994,
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780201633610-L.jpg',
      description: 'Captures a wealth of experience about the design of object-oriented software by four world-class designers.',
      copies: [
        { barcode: 'DP-001', status: 'AVAILABLE', shelfLocation: 'CS-B2-01' },
        { barcode: 'DP-002', status: 'BORROWED', shelfLocation: 'CS-B2-02' },
      ],
    },
    {
      isbn: '978-1449373320',
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      publisher: "O'Reilly Media",
      category: 'Data Engineering',
      publicationYear: 2017,
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg',
      description: 'The definitive guide to the architecture, scalability, consistency, and reliability of modern data systems.',
      copies: [
        { barcode: 'DDIA-001', status: 'AVAILABLE', shelfLocation: 'DATA-C1-01' },
        { barcode: 'DDIA-002', status: 'AVAILABLE', shelfLocation: 'DATA-C1-02' },
      ],
    },
    {
      isbn: '978-0135957059',
      title: 'The Pragmatic Programmer: Your Journey To Mastery',
      author: 'David Thomas, Andrew Hunt',
      publisher: 'Addison-Wesley',
      category: 'Software Engineering',
      publicationYear: 2019,
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg',
      description: 'Illustrates the best practices and major pitfalls of many different aspects of modern software development.',
      copies: [
        { barcode: 'PP-001', status: 'AVAILABLE', shelfLocation: 'CS-D1-01' },
        { barcode: 'PP-002', status: 'AVAILABLE', shelfLocation: 'CS-D1-02' },
      ],
    },
    {
      isbn: '978-0262046305',
      title: 'Introduction to Algorithms (4th Edition)',
      author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
      publisher: 'MIT Press',
      category: 'Algorithms',
      publicationYear: 2022,
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780262046305-L.jpg',
      description: 'The globally renowned comprehensive textbook covering the analysis and design of modern computer algorithms.',
      copies: [
        { barcode: 'ALGO-001', status: 'AVAILABLE', shelfLocation: 'ALGO-E1-01' },
        { barcode: 'BC-100234', status: 'AVAILABLE', shelfLocation: 'ALGO-E1-02' }, // Matches scanner terminal quick-test!
      ],
    },
    {
      isbn: '978-0262035613',
      title: 'Deep Learning',
      author: 'Ian Goodfellow, Yoshua Bengio, Aaron Courville',
      publisher: 'MIT Press',
      category: 'Artificial Intelligence',
      publicationYear: 2016,
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780262035613-L.jpg',
      description: 'An authoritative textbook on deep learning covering mathematical fundamentals, neural networks, and research perspectives.',
      copies: [
        { barcode: 'DL-001', status: 'AVAILABLE', shelfLocation: 'AI-F1-01' },
        { barcode: 'DL-002', status: 'AVAILABLE', shelfLocation: 'AI-F1-02' },
      ],
    },
    {
      isbn: '978-0735211292',
      title: 'Atomic Habits: An Easy & Proven Way to Build Good Habits',
      author: 'James Clear',
      publisher: 'Avery',
      category: 'Self-Improvement',
      publicationYear: 2018,
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg',
      description: 'A supremely practical framework for improving every day through tiny, compounding habit changes.',
      copies: [
        { barcode: 'AH-001', status: 'AVAILABLE', shelfLocation: 'SELF-G1-01' },
        { barcode: 'AH-002', status: 'AVAILABLE', shelfLocation: 'SELF-G1-02' },
      ],
    },
    {
      isbn: '978-0857197689',
      title: 'The Psychology of Money',
      author: 'Morgan Housel',
      publisher: 'Harriman House',
      category: 'Finance',
      publicationYear: 2020,
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg',
      description: 'Timeless lessons on wealth, greed, and happiness doing well with money isn’t necessarily about what you know.',
      copies: [
        { barcode: 'POM-001', status: 'AVAILABLE', shelfLocation: 'FIN-H1-01' },
      ],
    },
    {
      isbn: '978-0441172719',
      title: 'Dune',
      author: 'Frank Herbert',
      publisher: 'Chilton Books',
      category: 'Science Fiction',
      publicationYear: 1965,
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg',
      description: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world.',
      copies: [
        { barcode: 'DUNE-001', status: 'AVAILABLE', shelfLocation: 'SCI-I1-01' },
      ],
    },
    {
      isbn: '978-1451648539',
      title: 'Steve Jobs',
      author: 'Walter Isaacson',
      publisher: 'Simon & Schuster',
      category: 'Biography',
      publicationYear: 2011,
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9781451648539-L.jpg',
      description: 'Based on more than forty interviews with Jobs conducted over two years, this is the definitive biography of the creative entrepreneur.',
      copies: [
        { barcode: 'JOBS-001', status: 'AVAILABLE', shelfLocation: 'BIO-J1-01' },
      ],
    },
  ];

  const createdCopies: any[] = [];

  for (const b of booksData) {
    const { copies, ...bookData } = b;
    const book = await prisma.book.create({
      data: bookData,
    });

    for (const c of copies) {
      const copy = await prisma.bookCopy.create({
        data: {
          bookId: book.id,
          barcode: c.barcode,
          status: c.status as any,
          shelfLocation: c.shelfLocation,
        },
      });
      createdCopies.push({ ...copy, bookTitle: book.title });
    }
  }

  console.log(`Seeded ${booksData.length} books with verified online cover art and ${createdCopies.length} book copies.`);

  // 6. Loans, Fines, and Reservations
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const twelveDaysAhead = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);
  const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

  // Active Loan for Alex Rivera
  const borrowedCopy1 = createdCopies.find((c) => c.barcode === 'CC-002');
  if (borrowedCopy1) {
    await prisma.loan.create({
      data: {
        userId: member.id,
        copyId: borrowedCopy1.id,
        issueDate: twoDaysAgo,
        dueDate: twelveDaysAhead,
        status: 'ACTIVE',
        renewalCount: 0,
      },
    });
  }

  // Overdue Loan with Unpaid Fine for Alice
  const borrowedCopy2 = createdCopies.find((c) => c.barcode === 'DP-002');
  if (borrowedCopy2) {
    const overdueLoan = await prisma.loan.create({
      data: {
        userId: alice.id,
        copyId: borrowedCopy2.id,
        issueDate: twentyDaysAgo,
        dueDate: sixDaysAgo,
        status: 'OVERDUE',
        renewalCount: 0,
      },
    });

    await prisma.fine.create({
      data: {
        loanId: overdueLoan.id,
        amount: 30.0, // 6 days * 5.0
        paymentStatus: 'UNPAID',
      },
    });
  }

  // Active 24h Reservation for Bob with matching test pickup code
  const reservedCopy = createdCopies.find((c) => c.barcode === 'CC-003');
  if (reservedCopy) {
    const expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await prisma.reservation.create({
      data: {
        userId: bob.id,
        copyId: reservedCopy.id,
        pickupCode: 'RES-7492', // Matches quick-simulation button in Scanner Terminal!
        qrToken: 'res_a1b2c3d4e5f6', // Matches quick-simulation button in Scanner Terminal!
        reservationDate: now,
        expiryDate,
        status: 'ACTIVE',
      },
    });
  }

  // 7. Audit Log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'SYSTEM',
      details: {
        seededAt: now.toISOString(),
        booksCount: booksData.length,
        version: '1.2.0',
      },
      ipAddress: '127.0.0.1',
      userAgent: 'SeedScript/1.2',
    },
  });

  console.log('\n=============================================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log('=============================================================');
  console.log('DEFAULT LOGIN CREDENTIALS:');
  console.log('-------------------------------------------------------------');
  console.log('1. ADMINISTRATOR:');
  console.log(`   Username/Reg No: ADM-001  or  admin@library.com`);
  console.log(`   Password:        ${adminPassword}`);
  console.log(`   Role:            ADMINISTRATOR`);
  console.log('-------------------------------------------------------------');
  console.log('2. LIBRARIAN:');
  console.log(`   Username/Reg No: LIB-001  or  librarian@library.com`);
  console.log(`   Password:        ${librarianPassword}`);
  console.log(`   Role:            LIBRARIAN`);
  console.log('-------------------------------------------------------------');
  console.log('3. MEMBER / PATRON:');
  console.log(`   Username/Reg No: MEM-2026-001  or  member@library.com`);
  console.log(`   Password:        ${memberPassword}`);
  console.log(`   Card QR Token:   mem_98a7c2b6f103e5a4 (Hardware Scan Compatible)`);
  console.log(`   Role:            USER`);
  console.log('=============================================================\n');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
