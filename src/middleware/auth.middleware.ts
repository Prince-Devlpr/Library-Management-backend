import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, Role, UserStatus } from '../types/index.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { prisma } from '../config/database.js';
import { env } from '../config/env.config.js';

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token required', 'TOKEN_MISSING');
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token', 'TOKEN_INVALID');
    }

    // Verify session
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.revokedAt) {
      throw new UnauthorizedError('Session has been revoked or expired', 'SESSION_REVOKED');
    }

    // Enforce 15-minute session inactivity policy
    const inactivityTimeoutMs = env.SESSION_INACTIVITY_MINUTES * 60 * 1000;
    const idleTime = Date.now() - new Date(session.lastActivityAt).getTime();

    if (idleTime > inactivityTimeoutMs) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError('Session expired due to inactivity', 'SESSION_INACTIVITY_TIMEOUT');
    }

    // Refresh lastActivityAt
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    // Check user account status
    const user = session.user;
    if (!user) {
      throw new UnauthorizedError('User associated with session not found', 'USER_NOT_FOUND');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('Account is inactive. Please contact administration.', 'ACCOUNT_INACTIVE');
    }

    req.user = {
      id: user.id,
      registrationNumber: user.registrationNumber,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role as Role,
      status: user.status as UserStatus,
    };
    req.sessionId = session.id;

    next();
  } catch (error) {
    next(error);
  }
}
