import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, NotificationStatus } from '../../types/index.js';
import { NotificationService } from './notifications.service.js';
import { sendSuccess } from '../../utils/response.util.js';

export class NotificationsController {
  public static async getUserNotifications(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as NotificationStatus | undefined;

      const result = await NotificationService.getUserNotifications(req.user!.id, {
        page,
        limit,
        status,
      });

      sendSuccess(
        res,
        { notifications: result.notifications, unreadCount: result.unreadCount },
        'Notifications retrieved successfully',
        200,
        result.pagination,
      );
    } catch (error) {
      next(error);
    }
  }

  public static async getNotificationById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const notification = await NotificationService.getNotificationById(
        req.params.id,
        req.user!.id,
      );
      sendSuccess(res, notification, 'Notification retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async markAsRead(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const notification = await NotificationService.markAsRead(req.params.id, req.user!.id);
      sendSuccess(res, notification, 'Notification marked as read', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async markAllAsRead(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await NotificationService.markAllAsRead(req.user!.id);
      sendSuccess(res, result, 'All notifications marked as read', 200);
    } catch (error) {
      next(error);
    }
  }
}
