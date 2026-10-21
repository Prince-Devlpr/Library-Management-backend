import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : ['error'],
  });

if (process.env.NODE_ENV === 'development') {
  // @ts-expect-error Prisma event typing
  prisma.$on('query', (e: { query: string; duration: number }) => {
    logger.debug(`Prisma Query [${e.duration}ms]: ${e.query}`);
  });
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully.');
  } catch (error) {
    logger.error('Failed to connect to database', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected.');
}
