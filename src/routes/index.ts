import { Router } from 'express';
import authRouter from '../modules/auth/auth.routes.js';
import {
  usersRouter,
  adminUsersRouter,
  librarianUsersRouter,
} from '../modules/users/users.routes.js';
import booksRouter from '../modules/books/books.routes.js';
import {
  bookCopiesRouter,
  nestedBookCopiesRouter,
} from '../modules/book-copies/book-copies.routes.js';
import loansRouter from '../modules/loans/loans.routes.js';
import reservationsRouter from '../modules/reservations/reservations.routes.js';
import finesRouter from '../modules/fines/fines.routes.js';
import notificationsRouter from '../modules/notifications/notifications.routes.js';
import policiesRouter from '../modules/policies/policies.routes.js';
import reportsRouter from '../modules/reports/reports.routes.js';
import auditRouter from '../modules/audit/audit.routes.js';
import { qrRouter } from '../modules/qr/qr.routes.js';
import { paymentsRouter } from '../modules/payments/payments.routes.js';
import { uploadsRouter } from '../modules/uploads/uploads.routes.js';

export const apiV1Router = Router();

apiV1Router.use('/auth', authRouter);
apiV1Router.use('/users', usersRouter);
apiV1Router.use('/admin', adminUsersRouter);
apiV1Router.use('/admin/policy', policiesRouter);
apiV1Router.use('/admin/reports', reportsRouter);
apiV1Router.use('/librarian', librarianUsersRouter);

apiV1Router.use('/books/:bookId/copies', nestedBookCopiesRouter);
apiV1Router.use('/books', booksRouter);
apiV1Router.use('/book-copies', bookCopiesRouter);

apiV1Router.use('/loans', loansRouter);
apiV1Router.use('/reservations', reservationsRouter);
apiV1Router.use('/fines', finesRouter);
apiV1Router.use('/payments', paymentsRouter);
apiV1Router.use('/qr', qrRouter);
apiV1Router.use('/uploads', uploadsRouter);
apiV1Router.use('/notifications', notificationsRouter);
apiV1Router.use('/audit', auditRouter);
