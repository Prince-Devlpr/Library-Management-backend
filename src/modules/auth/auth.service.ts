import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { hashPassword, verifyPassword } from '../../utils/password.util.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt.util.js';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser, Role } from '../../types/index.js';
import { env } from '../../config/env.config.js';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

export class AuthService {
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public static async login(
    identifier: string,
    plainPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { registrationNumber: identifier.trim() },
        ],
      },
    });

    if (!user) {
      await AuditService.log({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'AUTH',
        details: { identifier, reason: 'USER_NOT_FOUND' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'ACTIVE') {
      await AuditService.log({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: user.id,
        details: { identifier, reason: 'ACCOUNT_INACTIVE' },
        ipAddress,
        userAgent,
      });
      throw new ForbiddenError(
        'Account is inactive. Please contact administration.',
        'ACCOUNT_INACTIVE',
      );
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, plainPassword);
    if (!isPasswordValid) {
      await AuditService.log({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: user.id,
        details: { identifier, reason: 'INVALID_PASSWORD' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Create session record
    const dummyTokenHash = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: dummyTokenHash,
        expiresAt,
        lastActivityAt: new Date(),
        ipAddress,
        userAgent,
      },
    });

    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role as Role,
      sessionId: session.id,
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
      sessionId: session.id,
    });

    // Update session with hashed refresh token
    const tokenHash = this.hashToken(refreshToken);
    await prisma.session.update({
      where: { id: session.id },
      data: { tokenHash },
    });

    await AuditService.log({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'AUTH',
      entityId: user.id,
      details: { role: user.role, sessionId: session.id },
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        registrationNumber: user.registrationNumber,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role as Role,
        status: user.status as AuthenticatedUser['status'],
      },
    };
  }

  public static async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const hashed = this.hashToken(refreshToken);
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.tokenHash !== hashed || session.revokedAt) {
      throw new UnauthorizedError('Session has expired or was revoked', 'SESSION_REVOKED');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedError('Refresh token expired', 'TOKEN_EXPIRED');
    }

    // Inactivity check
    const inactivityTimeoutMs = env.SESSION_INACTIVITY_MINUTES * 60 * 1000;
    const idleTime = Date.now() - new Date(session.lastActivityAt).getTime();
    if (idleTime > inactivityTimeoutMs) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError('Session expired due to inactivity', 'SESSION_INACTIVITY_TIMEOUT');
    }

    // Update last activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    const user = session.user;
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('Account is inactive', 'ACCOUNT_INACTIVE');
    }

    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role as Role,
      sessionId: session.id,
    });

    return { accessToken };
  }

  public static async logout(
    sessionId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });

    await AuditService.log({
      userId,
      action: 'AUTH_LOGOUT',
      entityType: 'AUTH',
      entityId: sessionId,
      ipAddress,
      userAgent,
    });
  }

  public static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    if (oldPassword === newPassword) {
      throw new ValidationError('New password must be different from current password');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValid = await verifyPassword(user.passwordHash, oldPassword);
    if (!isValid) {
      throw new UnauthorizedError('Incorrect current password', 'INVALID_PASSWORD');
    }

    const newHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      // Revoke other active sessions for security
      prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await AuditService.log({
      userId,
      action: 'USER_PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  public static async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      registrationNumber: user.registrationNumber,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role as Role,
      status: user.status as AuthenticatedUser['status'],
    };
  }
}
