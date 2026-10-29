import { z } from 'zod';

export const CreateReservationSchema = z
  .object({
    bookId: z.string().optional(),
    isbn: z.string().optional(),
    copyId: z.string().optional(),
    paymentMethod: z.enum(['RAZORPAY', 'CASH_COUNTER']).default('CASH_COUNTER').optional(),
    depositPaise: z.number().int().positive().default(2000).optional(),
    razorpayOrderId: z.string().optional(),
    razorpayPaymentId: z.string().optional(),
    razorpaySignature: z.string().optional(),
  })
  .refine((data) => data.bookId || data.copyId || data.isbn, {
    message: 'Either bookId, copyId, or isbn must be provided',
  });

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
