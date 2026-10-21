import request from 'supertest';
import { app } from '../src/app.js';

describe('Library Policy and Audit Logging', () => {
  let adminToken: string;

  beforeAll(async () => {
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'admin@library.local',
      password: 'AdminPassword123!',
    });
    adminToken = adminRes.body.data.accessToken;
  });

  it('should retrieve current library policy', async () => {
    const res = await request(app)
      .get('/api/v1/admin/policy')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.borrowLimit).toBeDefined();
    expect(res.body.data.maxRenewals).toBeDefined();
  });

  it('should allow administrator to update library policy values', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/policy')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        borrowLimit: 4,
        maxRenewals: 3,
        finePerDay: 1.5,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.borrowLimit).toBe(4);
    expect(res.body.data.maxRenewals).toBe(3);
    expect(Number(res.body.data.finePerDay)).toBe(1.5);
  });

  it('should reject invalid policy values (e.g. negative numbers)', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/policy')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        borrowLimit: -1,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should create audit log entries for policy and system changes', async () => {
    const res = await request(app)
      .get('/api/v1/audit?action=POLICY_UPDATED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].action).toBe('POLICY_UPDATED');
  });
});
