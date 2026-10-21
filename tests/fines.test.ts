import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';

describe('Fines API', () => {
  let userToken: string;
  let otherUserToken: string;
  let librarianToken: string;
  let testFineId: string;

  beforeAll(async () => {
    // Alice login
    const aliceRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'alice@example.com',
      password: 'UserPassword123!',
    });
    userToken = aliceRes.body.data.accessToken;

    // Bob login
    const bobRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'bob@example.com',
      password: 'UserPassword123!',
    });
    otherUserToken = bobRes.body.data.accessToken;

    // Librarian login
    const libRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'librarian1@library.local',
      password: 'LibrarianPassword123!',
    });
    librarianToken = libRes.body.data.accessToken;

    // Create a book, copy, loan, and unpaid fine specifically for this test suite
    const book = await prisma.book.findFirst();
    const copy = await prisma.bookCopy.create({
      data: {
        bookId: book!.id,
        barcode: `FINE-TEST-${Date.now()}`,
        shelfLocation: 'F-01',
        status: 'BORROWED',
      },
    });

    const user = await prisma.user.findUnique({ where: { email: 'alice@example.com' } });
    const loan = await prisma.loan.create({
      data: {
        userId: user!.id,
        copyId: copy.id,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'OVERDUE',
      },
    });

    const fine = await prisma.fine.create({
      data: {
        loanId: loan.id,
        amount: 5.0,
        paymentStatus: 'UNPAID',
      },
    });
    testFineId = fine.id;
  });

  it('should allow user to view their own fines (/fines/me)', async () => {
    const res = await request(app)
      .get('/api/v1/fines/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.fines)).toBe(true);
    expect(res.body.data.totalUnpaidAmount).toBeGreaterThan(0);
  });

  it('should prevent user from viewing another user fine details (403)', async () => {
    const res = await request(app)
      .get(`/api/v1/fines/${testFineId}`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.status).toBe(403);
  });

  it('should allow staff to view all outstanding fines', async () => {
    const res = await request(app)
      .get('/api/v1/fines?paymentStatus=UNPAID')
      .set('Authorization', `Bearer ${librarianToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should allow staff to mark fine as paid', async () => {
    const res = await request(app)
      .patch(`/api/v1/fines/${testFineId}/payment`)
      .set('Authorization', `Bearer ${librarianToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentStatus).toBe('PAID');
    expect(res.body.data.paymentDate).toBeDefined();
  });

  it('should reject duplicate payment on already paid fine (422)', async () => {
    const res = await request(app)
      .patch(`/api/v1/fines/${testFineId}/payment`)
      .set('Authorization', `Bearer ${librarianToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('FINE_ALREADY_PAID');
  });
});
