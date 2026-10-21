import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { BooksService } from './books.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import { CreateBookInput, UpdateBookInput, BookQueryInput } from './books.schema.js';

export class BooksController {
  public static async getBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as BookQueryInput;
      const result = await BooksService.getBooks(query);
      sendSuccess(res, result.books, 'Books retrieved successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async getBookById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const book = await BooksService.getBookById(req.params.id);
      sendSuccess(res, book, 'Book details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async createBook(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = req.body as CreateBookInput;
      const book = await BooksService.createBook(
        input,
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, book, 'Book created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async updateBook(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = req.body as UpdateBookInput;
      const book = await BooksService.updateBook(
        req.params.id,
        input,
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, book, 'Book updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async deleteBook(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await BooksService.deleteBook(
        req.params.id,
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, 'Book deleted successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
