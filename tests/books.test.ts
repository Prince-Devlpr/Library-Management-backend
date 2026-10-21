import request from 'supertest';
import { app } from '../src/app.js';

describe('Books and Copies API', () => {
  let librarianToken: string;
  let createdBookId: string;
  const uniqueSuffix = Date.now().toString();
  const testBarcode = `DDD-${uniqueSuffix}`;
  const testIsbn = `978-${uniqueSuffix.slice(-9)}-0`;

  beforeAll(async () => {
    const libRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'librarian1@library.local',
      password: 'LibrarianPassword123!',
    });
    librarianToken = libRes.body.data.accessToken;
  });

  it('should search books with query parameters and pagination', async () => {
    const res = await request(app).get('/api/v1/books?search=Clean&page=1&limit=5');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.data[0].title).toContain('Clean Code');
    expect(res.body.data[0].totalCopies).toBeDefined();
    expect(res.body.data[0].availableCopies).toBeDefined();
  });

  it('should get book details with copies inventory by ID', async () => {
    const listRes = await request(app).get('/api/v1/books?limit=1');
    const bookId = listRes.body.data[0].id;

    const res = await request(app).get(`/api/v1/books/${bookId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(bookId);
    expect(Array.isArray(res.body.data.copies)).toBe(true);
  });

  it('should allow librarian to create a new book', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        isbn: testIsbn,
        title: `Domain-Driven Design ${uniqueSuffix}`,
        author: 'Eric Evans',
        publisher: 'Addison-Wesley',
        category: 'Software Architecture',
        publicationYear: 2003,
        description: 'Describes systematic approach to domain-driven design.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    createdBookId = res.body.data.id;
  });

  it('should allow librarian to create physical copies for a book', async () => {
    const res = await request(app)
      .post(`/api/v1/books/${createdBookId}/copies`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        barcode: testBarcode,
        shelfLocation: 'ARCH-01',
        status: 'AVAILABLE',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.barcode).toBe(testBarcode);
  });

  it('should reject creating duplicate barcode (409 Conflict)', async () => {
    const res = await request(app)
      .post(`/api/v1/books/${createdBookId}/copies`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        barcode: testBarcode, // Already created
        shelfLocation: 'ARCH-02',
        status: 'AVAILABLE',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should lookup book copy by barcode', async () => {
    const res = await request(app).get(`/api/v1/book-copies/barcode/${testBarcode}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.barcode).toBe(testBarcode);
    expect(res.body.data.book.title).toContain('Domain-Driven Design');
  });

  it('should update book copy shelf location', async () => {
    const copyRes = await request(app).get(`/api/v1/book-copies/barcode/${testBarcode}`);
    const copyId = copyRes.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/book-copies/${copyId}`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        shelfLocation: 'ARCH-NEW-01',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.shelfLocation).toBe('ARCH-NEW-01');
  });
});
