import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { LoginInput, RefreshTokenInput, ChangePasswordInput } from './auth.schema.js';

export class AuthController {
  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password } = req.body as LoginInput;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.login(identifier, password, ip, userAgent);
      sendSuccess(res, result, 'Login successful', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;
      const result = await AuthService.refresh(refreshToken);
      sendSuccess(res, result, 'Token refreshed successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async logout(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const sessionId = req.sessionId!;
      const userId = req.user!.id;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      await AuthService.logout(sessionId, userId, ip, userAgent);
      sendSuccess(res, null, 'Logged out successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async changePassword(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { oldPassword, newPassword } = req.body as ChangePasswordInput;
      const userId = req.user!.id;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      await AuthService.changePassword(userId, oldPassword, newPassword, ip, userAgent);
      sendSuccess(res, null, 'Password changed successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async getMe(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await AuthService.getMe(userId);
      sendSuccess(res, user, 'Current user profile retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
