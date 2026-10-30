import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.config.js';
import { prisma } from './config/database.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { apiV1Router } from './routes/index.js';
import { swaggerSpec } from './swagger/swagger.js';
import { sendSuccess } from './utils/response.util.js';

export function createApp(): Application {
  const app = express();

  // Security Middleware
  app.use(helmet());

  // CORS Configuration
  const defaultAllowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'http://localhost:4174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:4173',
    'http://127.0.0.1:4174',
    'https://library-management-backend-cr47.onrender.com',
  ];

  const configuredOrigins = env.CORS_ORIGIN === '*'
    ? ['*']
    : env.CORS_ORIGIN.split(',').map((o) => o.trim());

  const hasWildcard = configuredOrigins.includes('*');

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, postman)
        if (!origin) return callback(null, true);

        if (hasWildcard) return callback(null, true);

        const allAllowed = new Set([...defaultAllowedOrigins, ...configuredOrigins]);
        if (allAllowed.has(origin)) {
          return callback(null, true);
        }

        // Allow any localhost/127.0.0.1 port in development/testing
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Not allowed by CORS: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    }),
  );

  // Request body parsing with generous size limit for photo uploads
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Correlation / Request ID Middleware
  app.use(requestIdMiddleware);

  // Health Checks
  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() }, 'System healthy');
  });

  app.get('/health/db', async (_req: Request, res: Response, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      sendSuccess(res, { status: 'ok', database: 'connected' }, 'Database healthy');
    } catch (error) {
      next(error);
    }
  });

  // Swagger Documentation
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Library Management System API Docs',
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );

  // API Version 1
  app.use('/api/v1', apiV1Router);

  // 404 and Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
