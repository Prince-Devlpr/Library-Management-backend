import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { AuditService } from './audit.service.js';
import { sendSuccess } from '../../utils/response.util.js';

export class AuditController {
  public static async getLogs(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const userId = req.query.userId as string | undefined;
      const action = req.query.action as string | undefined;
      const entityType = req.query.entityType as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      const result = await AuditService.getLogs({
        page,
        limit,
        userId,
        action,
        entityType,
        from,
        to,
      });

      sendSuccess(res, result.logs, 'Audit logs retrieved successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }
}
