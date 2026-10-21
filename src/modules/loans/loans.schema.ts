import { z } from 'zod';

export const IssueLoanSchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
  barcode: z.string().min(1, 'Barcode is required'),
});

export const ReturnLoanSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
});

export type IssueLoanInput = z.infer<typeof IssueLoanSchema>;
export type ReturnLoanInput = z.infer<typeof ReturnLoanSchema>;
