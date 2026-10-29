import { z } from 'zod';

export const IssueLoanSchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
  barcode: z.string().min(1, 'Barcode is required'),
});

export const ReturnLoanSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  condition: z.enum(['GOOD', 'MINOR_WEAR', 'DAMAGED', 'LOST']).optional().default('GOOD'),
  damageFine: z.union([z.number(), z.string().transform((v) => parseFloat(v))]).optional(),
  notes: z.string().optional(),
});

export type IssueLoanInput = z.infer<typeof IssueLoanSchema>;
export type ReturnLoanInput = z.infer<typeof ReturnLoanSchema>;
