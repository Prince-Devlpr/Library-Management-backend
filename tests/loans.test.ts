import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';

describe('Loans and Circulation Workflow', () => {
  let librarianToken: string;
  let userToken: string;
  let userId: string;
  let testCopyBarcode: string;
  let issuedLoanId: string;
  const uniqueId = Date.now().toString();

  beforeAll(async () => {
    // Librarian login
    const libRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'librarian1@library.local',
      password: 'LibrarianPassword123!',
    });
    librarianToken = libRes.body.data.accessToken;

    // Bob login
    const userRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'bob@example.com',
      password: 'UserPassword123!',
    });
    userToken = userRes.body.data.accessToken;
    userId = userRes.body.data.user.id;

    // Create a fresh book & available copy for loan testing
    const book = await prisma.book.create({
      data: {
        isbn: `978-${uniqueId.slice(-9)}-1`,
        title: `The C Programming Language ${uniqueId}`,
        author: 'Brian W. Kernighan, Dennis M. Ritchie',
        publisher: 'Prentice Hall',
        category: 'Computer Science',
        publicationYear: 1988,
      },
    });

    testCopyBarcode = `C-PROG-${uniqueId}`;
    await prisma.bookCopy.create({
      data: {
        bookId: book.id,
        barcode: testCopyBarcode,
        shelfLocation: 'CS-01',
        status: 'AVAILABLE',
      },
    });
  });

  it('should allow librarian to issue an available copy to a valid user', async () => {
    const res = await request(app)
      .post('/api/v1/loans/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        userId,
        barcode: testCopyBarcode,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.dueDate).toBeDefined();

    issuedLoanId = res.body.data.id;

    // Verify copy is now BORROWED
    const copy = await prisma.bookCopy.findUnique({ where: { barcode: testCopyBarcode } });
    expect(copy?.status).toBe('BORROWED');
  });

  it('should reject issuing the same copy again (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/v1/loans/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        userId,
        barcode: testCopyBarcode,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BOOK_COPY_UNAVAILABLE');
  });

  it('should allow user to renew their eligible active loan', async () => {
    const res = await request(app)
      .post(`/api/v1/loans/${issuedLoanId}/renew`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.renewalCount).toBe(1);
  });

  it('should enforce maxRenewals policy limit', async () => {
    const policy = await prisma.libraryPolicy.findFirst({ orderBy: { updatedAt: 'desc' } });
    const max = policy?.maxRenewals || 2;

    // Renew until reaching policy.maxRenewals
    for (let i = 2; i <= max; i++) {
      const renewRes = await request(app)
        .post(`/api/v1/loans/${issuedLoanId}/renew`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(renewRes.status).toBe(200);
    }

    // Next attempt should be rejected
    const excessRenew = await request(app)
      .post(`/api/v1/loans/${issuedLoanId}/renew`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(excessRenew.status).toBe(422);
    expect(excessRenew.body.error.code).toBe('MAX_RENEWALS_REACHED');
  });

  it('should allow librarian to return book copy and release copy to AVAILABLE', async () => {
    const res = await request(app)
      .post('/api/v1/loans/return')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        barcode: testCopyBarcode,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.barcode).toBe(testCopyBarcode);

    // Verify copy is back to AVAILABLE
    const copy = await prisma.bookCopy.findUnique({ where: { barcode: testCopyBarcode } });
    expect(copy?.status).toBe('AVAILABLE');
  });

  it('should automatically calculate overdue fine when returning late', async () => {
    const overdueBarcode = `C-OVERDUE-${Date.now()}`;
    const book = await prisma.book.findFirst();

    const copy = await prisma.bookCopy.create({
      data: {
        bookId: book!.id,
        barcode: overdueBarcode,
        shelfLocation: 'TEST-01',
        status: 'BORROWED',
      },
    });

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 1000);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    await prisma.loan.create({
      data: {
        userId,
        copyId: copy.id,
        issueDate: tenDaysAgo,
        dueDate: fiveDaysAgo,
        status: 'OVERDUE',
      },
    });

    const res = await request(app)
      .post('/api/v1/loans/return')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        barcode: overdueBarcode,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overdueDays).toBeGreaterThanOrEqual(5);
    expect(res.body.data.fine).toBeDefined();
    expect(Number(res.body.data.fine.amount)).toBeGreaterThan(0);
    expect(res.body.data.fine.paymentStatus).toBe('UNPAID');
  });

  it('should reject issuing a RESERVED copy to an unrelated patron (409 Conflict)', async () => {
    const book = await prisma.book.findFirst();
    const reservedBarcode = `C-RES-OTHER-${Date.now()}`;
    const copy = await prisma.bookCopy.create({
      data: {
        bookId: book!.id,
        barcode: reservedBarcode,
        shelfLocation: 'HOLD-01',
        status: 'RESERVED',
      },
    });

    const alice = await prisma.user.findUnique({ where: { email: 'alice@example.com' } });
    await prisma.reservation.create({
      data: {
        userId: alice!.id,
        copyId: copy.id,
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });

    // Attempt to issue to Bob (unrelated patron)
    const res = await request(app)
      .post('/api/v1/loans/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        userId, // Bob's ID
        barcode: reservedBarcode,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BOOK_COPY_UNAVAILABLE');
    expect(res.body.error.message).toContain('reserved by another patron');

    // Verify copy is still RESERVED
    const copyAfter = await prisma.bookCopy.findUnique({ where: { id: copy.id } });
    expect(copyAfter?.status).toBe('RESERVED');
  });

  it('should successfully issue a RESERVED copy to the reservation owner', async () => {
    const book = await prisma.book.findFirst();
    const reservedBarcode = `C-RES-OWNER-${Date.now()}`;
    const copy = await prisma.bookCopy.create({
      data: {
        bookId: book!.id,
        barcode: reservedBarcode,
        shelfLocation: 'HOLD-02',
        status: 'RESERVED',
      },
    });

    const alice = await prisma.user.findUnique({ where: { email: 'alice@example.com' } });
    const reservation = await prisma.reservation.create({
      data: {
        userId: alice!.id,
        copyId: copy.id,
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });

    // Issue to Alice (the reservation owner)
    const res = await request(app)
      .post('/api/v1/loans/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        userId: alice!.id,
        barcode: reservedBarcode,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACTIVE');

    // Verify BookCopy is now BORROWED
    const copyAfter = await prisma.bookCopy.findUnique({ where: { id: copy.id } });
    expect(copyAfter?.status).toBe('BORROWED');

    // Verify Reservation was transitioned to COLLECTED
    const resAfter = await prisma.reservation.findUnique({ where: { id: reservation.id } });
    expect(resAfter?.status).toBe('COLLECTED');
  });

  it('should reject issuance of an inconsistent RESERVED copy with no active reservation on file', async () => {
    const book = await prisma.book.findFirst();
    const staleBarcode = `C-STALE-RES-${Date.now()}`;
    await prisma.bookCopy.create({
      data: {
        bookId: book!.id,
        barcode: staleBarcode,
        shelfLocation: 'ERR-01',
        status: 'RESERVED', // Status says reserved, but no active reservation exists
      },
    });

    const res = await request(app)
      .post('/api/v1/loans/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        userId,
        barcode: staleBarcode,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BOOK_COPY_UNAVAILABLE');
  });

  it('should prevent race condition where an AVAILABLE copy becomes RESERVED concurrently', async () => {
    const book = await prisma.book.findFirst();
    const raceBarcode = `C-RACE-${Date.now()}`;
    const copy = await prisma.bookCopy.create({
      data: {
        bookId: book!.id,
        barcode: raceBarcode,
        shelfLocation: 'RACE-01',
        status: 'AVAILABLE',
      },
    });

    const alice = await prisma.user.findUnique({ where: { email: 'alice@example.com' } });

    // Transition copy to RESERVED right before Bob's issue executes
    await prisma.$transaction(async (tx) => {
      await tx.bookCopy.update({
        where: { id: copy.id },
        data: { status: 'RESERVED' },
      });
      await tx.reservation.create({
        data: {
          userId: alice!.id,
          copyId: copy.id,
          expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      });
    });

    // Bob attempts to issue without an active reservation
    const res = await request(app)
      .post('/api/v1/loans/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        userId, // Bob
        barcode: raceBarcode,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BOOK_COPY_UNAVAILABLE');
  });
});
