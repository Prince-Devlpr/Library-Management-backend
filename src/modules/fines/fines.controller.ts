import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, PaymentStatus } from '../../types/index.js';
import { FinesService } from './fines.service.js';
import { sendSuccess } from '../../utils/response.util.js';

export class FinesController {
  public static async getMyFines(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as PaymentStatus | undefined;

      const result = await FinesService.getMyFines(req.user!.id, { page, limit, status });
      sendSuccess(
        res,
        { fines: result.fines, totalUnpaidAmount: result.totalUnpaidAmount },
        'User fines retrieved successfully',
        200,
        result.pagination,
      );
    } catch (error) {
      next(error);
    }
  }

  public static async getAllFines(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const paymentStatus = req.query.paymentStatus as PaymentStatus | undefined;
      const userId = req.query.userId as string | undefined;

      const result = await FinesService.getAllFines({ page, limit, paymentStatus, userId });
      sendSuccess(res, result.fines, 'Fines retrieved successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async getFineById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const fine = await FinesService.getFineById(req.params.id, req.user!.id, req.user!.role);
      sendSuccess(res, fine, 'Fine details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async markAsPaid(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const updated = await FinesService.markFineAsPaid(
        req.params.id,
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, updated, 'Fine marked as paid successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
