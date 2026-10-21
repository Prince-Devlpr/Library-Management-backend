import { z } from 'zod';

export const UpdatePolicySchema = z.object({
  borrowLimit: z.number().int().positive('Borrow limit must be a positive integer').optional(),
  loanDuration: z.number().int().positive('Loan duration must be positive days').optional(),
  reservationPeriod: z.number().int().positive('Reservation period must be positive days').optional(),
  finePerDay: z.number().min(0, 'Fine per day cannot be negative').optional(),
  maxRenewals: z.number().int().min(0, 'Max renewals cannot be negative').optional(),
});

export type UpdatePolicyInput = z.infer<typeof UpdatePolicySchema>;
