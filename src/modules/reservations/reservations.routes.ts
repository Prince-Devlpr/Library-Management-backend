import { Router } from 'express';
import { ReservationsController } from './reservations.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { CreateReservationSchema } from './reservations.schema.js';

const router = Router();
router.use(authenticate);

// Create reservation (Patron, Librarian, Admin)
router.post('/', validate({ body: CreateReservationSchema }), ReservationsController.createReservation);

// View reservations (Role-filtered)
router.get('/', ReservationsController.getReservations);

// Admin/Librarian trigger expiration
router.post(
  '/process-expired',
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  ReservationsController.processExpired,
);

// View specific reservation
router.get('/:id', ReservationsController.getReservationById);

// Cancel reservation (Self or Staff)
router.patch('/:id/cancel', ReservationsController.cancelReservation);
router.delete('/:id', ReservationsController.cancelReservation);

export default router;
