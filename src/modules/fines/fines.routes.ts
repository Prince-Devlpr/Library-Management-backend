import { Router } from 'express';
import { FinesController } from './fines.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);

// User's own fines
router.get('/me', FinesController.getMyFines);

// Staff view all fines (Librarian, Administrator)
router.get('/', authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'), FinesController.getAllFines);

// Specific fine details
router.get('/:id', FinesController.getFineById);

// Mark fine as paid (Librarian, Administrator)
router.patch(
  '/:id/payment',
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  FinesController.markAsPaid,
);

export default router;
