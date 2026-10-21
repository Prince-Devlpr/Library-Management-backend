import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, Role } from '../../types/index.js';
import { UsersService } from './users.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  AdminCreateLibrarianInput,
} from './users.schema.js';

export class AdminUsersController {
  public static async getUsers(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = req.query.search as string | undefined;
      const role = req.query.role as Role | undefined;
      const status = req.query.status as 'ACTIVE' | 'INACTIVE' | undefined;

      const result = await UsersService.adminGetUsers({ page, limit, search, role, status });
      sendSuccess(res, result.users, 'Users retrieved successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async getUserById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await UsersService.adminGetUserById(req.params.id);
      sendSuccess(res, user, 'User details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async createUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = req.body as AdminCreateUserInput;
      const user = await UsersService.adminCreateUser(
        input,
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, user, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async updateUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = req.body as AdminUpdateUserInput;
      const user = await UsersService.adminUpdateUser(
        req.params.id,
        input,
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, user, 'User updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async activateUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await UsersService.adminSetUserStatus(
        req.params.id,
        'ACTIVE',
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, user, 'User account activated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async deactivateUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await UsersService.adminSetUserStatus(
        req.params.id,
        'INACTIVE',
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, user, 'User account deactivated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async createLibrarian(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = req.body as AdminCreateLibrarianInput;
      const user = await UsersService.adminCreateLibrarian(
        input,
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, user, 'Librarian account created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}
