import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';

describe('Reservations System', () => {
  let userToken: string;
  let otherUserToken: string;
  let testCopyId: string;
  let reservationId: string;

  beforeAll(async () => {
    // Bob login
    const bobRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'bob@example.com',
      password: 'UserPassword123!',
    });
    userToken = bobRes.body.data.accessToken;

    // Alice login
    const aliceRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'alice@example.com',
      password: 'UserPassword123!',
    });
    otherUserToken = aliceRes.body.data.accessToken;

    // Create available copy with unique barcode
    const book = await prisma.book.findFirst();
    const copy = await prisma.bookCopy.create({
      data: {
        bookId: book!.id,
        barcode: `RES-TEST-${Date.now()}`,
        shelfLocation: 'R-01',
        status: 'AVAILABLE',
      },
    });
    testCopyId = copy.id;
  });

  it('should allow user to reserve an available book copy', async () => {
    const res = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        copyId: testCopyId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACTIVE');
    reservationId = res.body.data.id;

    // Verify copy is now RESERVED
    const copy = await prisma.bookCopy.findUnique({ where: { id: testCopyId } });
    expect(copy?.status).toBe('RESERVED');
  });

  it('should prevent another user from reserving the already reserved copy', async () => {
    const res = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        copyId: testCopyId,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should prevent unauthorized cancellation by a different user (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('UNAUTHORIZED_CANCELLATION');
  });

  it('should allow user to cancel their own reservation and release copy to AVAILABLE', async () => {
    const res = await request(app)
      .patch(`/api/v1/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CANCELLED');

    // Verify copy is now AVAILABLE again
    const copy = await prisma.bookCopy.findUnique({ where: { id: testCopyId } });
    expect(copy?.status).toBe('AVAILABLE');
  });
});
