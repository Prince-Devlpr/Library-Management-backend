import request from 'supertest';
import { app } from '../src/app.js';

describe('Role-Based Access Control (RBAC)', () => {
  let userToken: string;
  let librarianToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // User login
    const userRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'alice@example.com',
      password: 'UserPassword123!',
    });
    userToken = userRes.body.data.accessToken;

    // Librarian login
    const libRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'librarian1@library.local',
      password: 'LibrarianPassword123!',
    });
    librarianToken = libRes.body.data.accessToken;

    // Admin login
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'admin@library.local',
      password: 'AdminPassword123!',
    });
    adminToken = adminRes.body.data.accessToken;
  });

  it('USER cannot issue books (forbidden 403)', async () => {
    const res = await request(app)
      .post('/api/v1/loans/issue')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        userId: 'some-user-id',
        barcode: 'CC-001',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_ROLE_PERMISSIONS');
  });

  it('USER cannot update library policy (forbidden 403)', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/policy')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        borrowLimit: 5,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('LIBRARIAN cannot update library policy (forbidden 403)', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/policy')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        borrowLimit: 5,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('LIBRARIAN cannot access admin user management (forbidden 403)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${librarianToken}`);

    expect(res.status).toBe(403);
  });

  it('ADMINISTRATOR can access policy and user management', async () => {
    const policyRes = await request(app)
      .get('/api/v1/admin/policy')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(policyRes.status).toBe(200);
    expect(policyRes.body.success).toBe(true);

    const usersRes = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(usersRes.status).toBe(200);
    expect(usersRes.body.success).toBe(true);
  });
});
