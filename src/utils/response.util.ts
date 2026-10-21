import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types/index.js';

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200,
  pagination?: PaginationMeta,
): Response {
  const payload: ApiResponse<T> = {
    success: true,
  };

  if (data !== undefined) {
    payload.data = data;
  }

  if (message !== undefined) {
    payload.message = message;
  }

  if (pagination !== undefined) {
    payload.pagination = pagination;
  }

  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  statusCode = 500,
  code = 'INTERNAL_SERVER_ERROR',
  message = 'An unexpected error occurred',
  details?: unknown,
): Response {
  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };

  return res.status(statusCode).json(payload);
}
