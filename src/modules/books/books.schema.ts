import { z } from 'zod';

export const CreateBookSchema = z.object({
  isbn: z.string().min(10, 'Valid ISBN required'),
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  publisher: z.string().min(1, 'Publisher is required'),
  category: z.string().min(1, 'Category is required'),
  publicationYear: z.number().int().min(1000).max(new Date().getFullYear() + 1),
  description: z.string().optional(),
  price: z.union([z.number(), z.string().transform((v) => parseFloat(v))]).optional(),
  coverUrl: z.string().optional(),
  coverPublicId: z.string().optional(),
});

export const UpdateBookSchema = z.object({
  isbn: z.string().min(10).optional(),
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  publisher: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  publicationYear: z.number().int().min(1000).max(new Date().getFullYear() + 1).optional(),
  description: z.string().optional(),
  price: z.union([z.number(), z.string().transform((v) => parseFloat(v))]).optional(),
  coverUrl: z.string().optional(),
  coverPublicId: z.string().optional(),
});

export const BookQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  search: z.string().optional(),
  title: z.string().optional(),
  author: z.string().optional(),
  isbn: z.string().optional(),
  category: z.string().optional(),
  sortBy: z.enum(['title', 'author', 'publicationYear', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateBookInput = z.infer<typeof CreateBookSchema>;
export type UpdateBookInput = z.infer<typeof UpdateBookSchema>;
export type BookQueryInput = z.infer<typeof BookQuerySchema>;
