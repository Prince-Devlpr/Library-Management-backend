import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../types/index.js';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'];
  const requestId = (typeof existingId === 'string' && existingId) || uuidv4();

  (req as AuthenticatedRequest).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
