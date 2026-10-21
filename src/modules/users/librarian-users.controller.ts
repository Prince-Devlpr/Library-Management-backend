import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { UsersService } from './users.service.js';
import { sendSuccess } from '../../utils/response.util.js';

export class LibrarianUsersController {
  public static async searchUsers(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await UsersService.librarianSearchUsers({ search, page, limit });
      sendSuccess(res, result.users, 'Users retrieved successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async getUserLoans(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await UsersService.librarianGetUserLoans(req.params.userId);
      sendSuccess(res, result, 'User borrowing history retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
