import { Router } from 'express';
import { QrController } from './qr.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';

export const qrRouter = Router();

// Member digital card QR
qrRouter.get('/member/card', authenticate, QrController.getMemberCard);
qrRouter.post('/member/regenerate', authenticate, QrController.regenerateMemberCard);

// Copy QR & label preview
qrRouter.get('/copy/:barcode', authenticate, QrController.getCopyQr);

// Reservation QR & countdown
qrRouter.get('/reservation/:id', authenticate, QrController.getReservationQr);

// Counter scanner resolve (Staff only)
qrRouter.post('/resolve', authenticate, authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'), QrController.resolveScan);
