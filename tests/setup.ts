import { prisma } from '../src/config/database.js';

beforeAll(async () => {
  // Ensure DB connection is active before running tests
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
