import { Request } from 'express';

export type Role = 'USER' | 'LIBRARIAN' | 'ADMINISTRATOR';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type CopyStatus = 'AVAILABLE' | 'RESERVED' | 'BORROWED' | 'LOST' | 'DAMAGED';
export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE';
export type ReservationStatus = 'ACTIVE' | 'COLLECTED' | 'CANCELLED' | 'EXPIRED';
export type PaymentStatus = 'PAID' | 'UNPAID';
export type NotificationType =
  | 'RESERVATION_CONFIRMED'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'RESERVATION_READY'
  | 'FINE_PAYMENT_SUCCESS'
  | 'GENERAL';
export type NotificationStatus = 'READ' | 'UNREAD';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: PaginationMeta;
  error?: ApiErrorPayload;
}

export interface JwtPayload {
  userId: string;
  role: Role;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  registrationNumber: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: Role;
  status: UserStatus;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  sessionId?: string;
  requestId?: string;
}
