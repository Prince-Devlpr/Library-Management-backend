import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { LoansService } from './loans.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import { IssueLoanInput, ReturnLoanInput } from './loans.schema.js';

export class LoansController {
  public static async issueBook(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = req.body as IssueLoanInput;
      const loan = await LoansService.issueBook(
        req.user!.id,
        input,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, loan, 'Book issued successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async returnBook(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = req.body as ReturnLoanInput;
      const result = await LoansService.returnBook(
        req.user!.id,
        input,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, 'Book returned successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async renewLoan(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const updated = await LoansService.renewLoan(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, updated, 'Loan renewed successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async getMyActiveLoans(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const loans = await LoansService.getMyActiveLoans(req.user!.id);
      sendSuccess(res, loans, 'Active loans retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async getMyLoanHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await LoansService.getMyLoanHistory(req.user!.id, { page, limit });
      sendSuccess(res, result.loans, 'Loan history retrieved successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async getLoanById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const loan = await LoansService.getLoanById(req.params.id, req.user!.id, req.user!.role);
      sendSuccess(res, loan, 'Loan details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async getOverdueLoans(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await LoansService.getOverdueLoans({ page, limit });
      sendSuccess(res, result.loans, 'Overdue loans retrieved successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async updateOverdueStatuses(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await LoansService.updateOverdueStatuses();
      sendSuccess(res, result, 'Overdue loan statuses synchronized successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
