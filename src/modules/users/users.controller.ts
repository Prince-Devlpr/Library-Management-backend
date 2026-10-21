import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { UsersService } from './users.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import { UpdateProfileInput } from './users.schema.js';

export class UsersController {
  public static async getProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await UsersService.getProfile(req.user!.id);
      sendSuccess(res, user, 'Profile retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async updateProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = req.body as UpdateProfileInput;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const updated = await UsersService.updateProfile(req.user!.id, input, ip, userAgent);
      sendSuccess(res, updated, 'Profile updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
