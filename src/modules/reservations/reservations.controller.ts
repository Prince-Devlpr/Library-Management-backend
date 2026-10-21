import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ReservationStatus } from '../../types/index.js';
import { ReservationsService } from './reservations.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import { CreateReservationInput } from './reservations.schema.js';

export class ReservationsController {
  public static async createReservation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = req.body as CreateReservationInput;
      const reservation = await ReservationsService.createReservation(
        req.user!.id,
        input,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, reservation, 'Reservation created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async getReservations(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as ReservationStatus | undefined;
      const userId = req.query.userId as string | undefined;

      const result = await ReservationsService.getReservations(req.user!.id, req.user!.role, {
        page,
        limit,
        status,
        userId,
      });

      sendSuccess(res, result.reservations, 'Reservations retrieved successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async getReservationById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const reservation = await ReservationsService.getReservationById(
        req.params.id,
        req.user!.id,
        req.user!.role,
      );
      sendSuccess(res, reservation, 'Reservation retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async cancelReservation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const cancelled = await ReservationsService.cancelReservation(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, cancelled, 'Reservation cancelled successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async processExpired(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await ReservationsService.processExpiredReservations();
      sendSuccess(res, result, 'Expired reservations processed successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
