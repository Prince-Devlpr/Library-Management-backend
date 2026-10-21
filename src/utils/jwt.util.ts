import jwt from 'jsonwebtoken';
import { env } from '../config/env.config.js';
import { JwtPayload, Role } from '../types/index.js';

export function signAccessToken(payload: { userId: string; role: Role; sessionId: string }): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: { userId: string; sessionId: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): { userId: string; sessionId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string; sessionId: string };
}
