import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  phoneNumber: z.string().min(5, 'Valid phone number required').optional(),
  email: z.string().email('Valid email required').optional(),
});

export const AdminCreateUserSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phoneNumber: z.string().min(5, 'Valid phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['USER', 'LIBRARIAN', 'ADMINISTRATOR']).default('USER'),
});

export const AdminUpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(5).optional(),
  role: z.enum(['USER', 'LIBRARIAN', 'ADMINISTRATOR']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const AdminCreateLibrarianSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phoneNumber: z.string().min(5, 'Valid phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type AdminCreateUserInput = z.infer<typeof AdminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserSchema>;
export type AdminCreateLibrarianInput = z.infer<typeof AdminCreateLibrarianSchema>;
