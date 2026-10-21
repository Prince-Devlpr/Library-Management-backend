import { Router } from 'express';
import { BookCopiesController } from './book-copies.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { CreateBookCopySchema, UpdateBookCopySchema } from './book-copies.schema.js';

export const bookCopiesRouter = Router();

// Lookup barcode (Staff & Patrons)
bookCopiesRouter.get('/barcode/:barcode', BookCopiesController.getCopyByBarcode);

// Individual copy by ID
bookCopiesRouter.get('/:id', BookCopiesController.getCopyById);

// Update/Delete copy (Librarian, Administrator)
bookCopiesRouter.patch(
  '/:id',
  authenticate,
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  validate({ body: UpdateBookCopySchema }),
  BookCopiesController.updateCopy,
);

bookCopiesRouter.delete(
  '/:id',
  authenticate,
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  BookCopiesController.deleteCopy,
);

// Nested router for /api/v1/books/:bookId/copies
export const nestedBookCopiesRouter = Router({ mergeParams: true });
nestedBookCopiesRouter.get('/', BookCopiesController.getCopiesByBookId);
nestedBookCopiesRouter.post(
  '/',
  authenticate,
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  validate({ body: CreateBookCopySchema }),
  BookCopiesController.createCopy,
);
