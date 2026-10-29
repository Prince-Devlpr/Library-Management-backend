import 'dotenv/config';
import { prisma } from '../src/config/database.js';
import argon2 from 'argon2';

// Set global Jest timeout for all test suites to avoid 5000ms hook timeouts
jest.setTimeout(30000);

async function hash(pw: string): Promise<string> {
  return argon2.hash(pw, {
    type: argon2.argon2id,
    memoryCost: 4096, // Fast memory cost optimized for testing
    timeCost: 2,     // Fast time cost (argon2 verify automatically detects params)
    parallelism: 1,
  });
}

beforeAll(async () => {
  try {
    // Ensure DB connection is active before running tests
    await prisma.$connect();
  } catch (err: any) {
    console.warn(`[WARN] Database connection failed in setup: ${err.message}`);
    return;
  }

  try {
    // Precompute password hashes in parallel
    const [userPasswordHash, libPasswordHash, adminPasswordHash] = await Promise.all([
      hash('UserPassword123!'),
      hash('LibrarianPassword123!'),
      hash('AdminPassword123!'),
    ]);

    // Ensure USR-1001, USR-1002, and USR-1003 are not occupied by conflicting accounts
    await Promise.all([
      prisma.user.updateMany({
        where: {
          registrationNumber: 'USR-1001',
          NOT: { email: 'alice@example.com' },
        },
        data: { registrationNumber: 'MEM-2026-002' },
      }),
      prisma.user.updateMany({
        where: {
          registrationNumber: 'USR-1002',
          NOT: { email: 'bob@example.com' },
        },
        data: { registrationNumber: 'MEM-2026-003' },
      }),
      prisma.user.updateMany({
        where: {
          registrationNumber: 'USR-1003',
          NOT: { email: 'charlie@example.com' },
        },
        data: { registrationNumber: 'MEM-2026-004' },
      }),
    ]);

    // Ensure test users exist with exact emails and registration numbers required by tests
    await Promise.all([
      prisma.user.upsert({
        where: { email: 'alice@example.com' },
        update: { passwordHash: userPasswordHash, status: 'ACTIVE', registrationNumber: 'USR-1001' },
        create: {
          registrationNumber: 'USR-1001',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          phoneNumber: '+1-555-0201',
          passwordHash: userPasswordHash,
          role: 'USER',
          status: 'ACTIVE',
        },
      }),

      prisma.user.upsert({
        where: { email: 'bob@example.com' },
        update: { passwordHash: userPasswordHash, status: 'ACTIVE', registrationNumber: 'USR-1002' },
        create: {
          registrationNumber: 'USR-1002',
          name: 'Bob Smith',
          email: 'bob@example.com',
          phoneNumber: '+1-555-0202',
          passwordHash: userPasswordHash,
          role: 'USER',
          status: 'ACTIVE',
        },
      }),

      prisma.user.upsert({
        where: { email: 'charlie@example.com' },
        update: { passwordHash: userPasswordHash, status: 'INACTIVE', registrationNumber: 'USR-1003' },
        create: {
          registrationNumber: 'USR-1003',
          name: 'Charlie Inactive',
          email: 'charlie@example.com',
          phoneNumber: '+1-555-0203',
          passwordHash: userPasswordHash,
          role: 'USER',
          status: 'INACTIVE',
        },
      }),

      prisma.user.upsert({
        where: { email: 'librarian1@library.local' },
        update: { passwordHash: libPasswordHash, status: 'ACTIVE' },
        create: {
          registrationNumber: 'LIB-TEST-001',
          name: 'Test Librarian',
          email: 'librarian1@library.local',
          phoneNumber: '+1-555-0101',
          passwordHash: libPasswordHash,
          role: 'LIBRARIAN',
          status: 'ACTIVE',
        },
      }),

      prisma.user.upsert({
        where: { email: 'admin@library.local' },
        update: { passwordHash: adminPasswordHash, status: 'ACTIVE' },
        create: {
          registrationNumber: 'ADM-002',
          name: 'Test Admin',
          email: 'admin@library.local',
          phoneNumber: '+1-555-0100',
          passwordHash: adminPasswordHash,
          role: 'ADMINISTRATOR',
          status: 'ACTIVE',
        },
      }),
    ]);
  } catch (err: any) {
    console.error('Error seeding test fixtures in setup.ts:', err.message);
  }
}, 30000);

afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect errors
  }
}, 10000);
