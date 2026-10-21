import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { ReportsService } from './reports.service.js';
import { sendSuccess } from '../../utils/response.util.js';

export class ReportsController {
  public static async getCirculationReport(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const report = await ReportsService.getCirculationReport(from, to);
      sendSuccess(res, report, 'Circulation report generated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async getOverdueReport(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const report = await ReportsService.getOverdueReport();
      sendSuccess(res, report, 'Overdue report generated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async getFineReport(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const report = await ReportsService.getFineReport(from, to);
      sendSuccess(res, report, 'Fine collection report generated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async getBorrowingStatistics(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const stats = await ReportsService.getBorrowingStatistics();
      sendSuccess(res, stats, 'Borrowing statistics generated successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
