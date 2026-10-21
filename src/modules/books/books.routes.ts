import { Router } from 'express';
import { BooksController } from './books.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { CreateBookSchema, UpdateBookSchema, BookQuerySchema } from './books.schema.js';

const router = Router();

// Public / Authenticated catalog search
router.get('/', validate({ query: BookQuerySchema }), BooksController.getBooks);
router.get('/:id', BooksController.getBookById);

// Staff only (Librarian, Administrator)
router.post(
  '/',
  authenticate,
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  validate({ body: CreateBookSchema }),
  BooksController.createBook,
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  validate({ body: UpdateBookSchema }),
  BooksController.updateBook,
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  BooksController.deleteBook,
);

export default router;
