import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.util.js';
import { logger } from '../config/logger.js';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle known AppError
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.code}] on ${req.method} ${req.url}: ${err.message}`, {
      code: err.code,
      details: err.details,
      ip: req.ip,
    });
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // Handle Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (P2002)
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'resource';
      sendError(res, 409, 'UNIQUE_CONSTRAINT_VIOLATION', `A record with this ${target} already exists.`, {
        target: err.meta?.target,
      });
      return;
    }
    // Record not found (P2025)
    if (err.code === 'P2025') {
      sendError(res, 404, 'NOT_FOUND', 'Requested resource was not found.');
      return;
    }
    // Foreign key violation (P2003)
    if (err.code === 'P2003') {
      sendError(res, 409, 'FOREIGN_KEY_VIOLATION', 'Operation violates related entity constraint.');
      return;
    }
  }

  // Handle unhandled errors
  logger.error(`Unhandled exception on ${req.method} ${req.url}`, err, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    isProduction ? 'An unexpected server error occurred.' : err.message,
    isProduction ? undefined : { stack: err.stack },
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`);
}
