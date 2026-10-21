import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { BookCopiesService } from './book-copies.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import { CreateBookCopyInput, UpdateBookCopyInput } from './book-copies.schema.js';

export class BookCopiesController {
  public static async getCopiesByBookId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const copies = await BookCopiesService.getCopiesByBookId(req.params.bookId);
      sendSuccess(res, copies, 'Book copies retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async getCopyById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const copy = await BookCopiesService.getCopyById(req.params.id);
      sendSuccess(res, copy, 'Book copy details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async getCopyByBarcode(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const copy = await BookCopiesService.getCopyByBarcode(req.params.barcode);
      sendSuccess(res, copy, 'Book copy retrieved by barcode successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async createCopy(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = req.body as CreateBookCopyInput;
      const copy = await BookCopiesService.createCopy(
        req.params.bookId,
        input,
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, copy, 'Book copy created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async updateCopy(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = req.body as UpdateBookCopyInput;
      const copy = await BookCopiesService.updateCopy(
        req.params.id,
        input,
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, copy, 'Book copy updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async deleteCopy(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await BookCopiesService.deleteCopy(
        req.params.id,
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, 'Book copy deleted successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
