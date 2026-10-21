import { Router } from 'express';
import { PaymentsController } from './payments.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';

export const paymentsRouter = Router();

// Gateway status check (open to clients)
paymentsRouter.get('/gateway-status', PaymentsController.getGatewayStatus);

// Member payment flows (Online Razorpay vs Counter Cash Slip)
paymentsRouter.post('/create-order', authenticate, PaymentsController.createOrder);
paymentsRouter.post('/create-reservation-order', authenticate, PaymentsController.createReservationOrder);
paymentsRouter.post('/verify', authenticate, PaymentsController.verifyPayment);
paymentsRouter.post('/request-cash-slip', authenticate, PaymentsController.requestCashSlip);
paymentsRouter.get('/receipt/:receiptNumber', authenticate, PaymentsController.getReceipt);

// Staff counter payment flow
paymentsRouter.post(
  '/counter',
  authenticate,
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  PaymentsController.recordCounterPayment
);
