import { z } from 'zod';

export const CreateReservationSchema = z
  .object({
    bookId: z.string().uuid('Valid book ID required').optional(),
    copyId: z.string().uuid('Valid copy ID required').optional(),
    paymentMethod: z.enum(['RAZORPAY', 'CASH_COUNTER']).default('CASH_COUNTER').optional(),
    depositPaise: z.number().int().positive().default(2000).optional(),
    razorpayOrderId: z.string().optional(),
    razorpayPaymentId: z.string().optional(),
    razorpaySignature: z.string().optional(),
  })
  .refine((data) => data.bookId || data.copyId, {
    message: 'Either bookId or copyId must be provided',
  });

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
