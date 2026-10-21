import request from 'supertest';
import { app } from '../src/app.js';

describe('Authentication API (/api/v1/auth)', () => {
  let userAccessToken: string;
  let userRefreshToken: string;

  it('should authenticate user with email and password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: 'alice@example.com',
      password: 'UserPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.user.role).toBe('USER');
    expect(res.body.data.user.passwordHash).toBeUndefined();

    userAccessToken = res.body.data.accessToken;
    userRefreshToken = res.body.data.refreshToken;
  });

  it('should authenticate user with registration number and password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: 'USR-1001',
      password: 'UserPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.registrationNumber).toBe('USR-1001');
  });

  it('should reject authentication with invalid password (401)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: 'alice@example.com',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject authentication with non-existent identifier (401)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: 'ghost@example.com',
      password: 'UserPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject authentication for inactive user accounts (403)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: 'charlie@example.com',
      password: 'UserPassword123!',
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('should access /auth/me with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('alice@example.com');
  });

  it('should reject protected route when Authorization header is missing (401)', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('should refresh access token with valid refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: userRefreshToken,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('should logout and invalidate current session', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${userAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Subsequent request with the same token should now be rejected as session revoked
    const postLogout = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userAccessToken}`);

    expect(postLogout.status).toBe(401);
    expect(postLogout.body.error.code).toBe('SESSION_REVOKED');
  });
});
