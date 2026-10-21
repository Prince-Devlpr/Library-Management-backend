import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, Role } from '../types/index.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required', 'AUTHENTICATION_REQUIRED'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new ForbiddenError(
          `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
          'INSUFFICIENT_ROLE_PERMISSIONS',
        ),
      );
      return;
    }

    next();
  };
}
