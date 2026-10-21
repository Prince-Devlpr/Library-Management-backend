import { z } from 'zod';

export const CreateBookCopySchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  shelfLocation: z.string().min(1, 'Shelf location is required'),
  status: z.enum(['AVAILABLE', 'RESERVED', 'BORROWED', 'LOST', 'DAMAGED']).default('AVAILABLE'),
});

export const UpdateBookCopySchema = z.object({
  barcode: z.string().min(1).optional(),
  shelfLocation: z.string().min(1).optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'BORROWED', 'LOST', 'DAMAGED']).optional(),
});

export type CreateBookCopyInput = z.infer<typeof CreateBookCopySchema>;
export type UpdateBookCopyInput = z.infer<typeof UpdateBookCopySchema>;
