import { Router } from 'express';
import { LoansController } from './loans.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { IssueLoanSchema, ReturnLoanSchema } from './loans.schema.js';

const router = Router();
router.use(authenticate);

// 1. Issue Book (Librarian, Administrator)
router.post(
  '/issue',
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  validate({ body: IssueLoanSchema }),
  LoansController.issueBook,
);

// 2. Return Book (Librarian, Administrator)
router.post(
  '/return',
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  validate({ body: ReturnLoanSchema }),
  LoansController.returnBook,
);

// 3. User's own loans & history
router.get('/me', LoansController.getMyActiveLoans);
router.get('/me/history', LoansController.getMyLoanHistory);

// 4. Overdue management (Librarian, Administrator)
router.get('/overdue', authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'), LoansController.getOverdueLoans);
router.post('/sync-overdue', authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'), LoansController.updateOverdueStatuses);

// 5. Individual loan details
router.get('/:id', LoansController.getLoanById);

// 6. Renew loan
router.post('/:id/renew', LoansController.renewLoan);

export default router;
