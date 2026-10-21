import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { NotificationType, NotificationStatus, PaginationMeta } from '../../types/index.js';
import { Prisma } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  message: string;
  type: NotificationType;
}

export class NotificationService {
  public static async createNotification(input: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        userId: input.userId,
        message: input.message,
        type: input.type,
        status: 'UNREAD',
        notificationDate: new Date(),
      },
    });
  }

  public static async getUserNotifications(
    userId: string,
    query: { page?: number; limit?: number; status?: NotificationStatus },
  ): Promise<{ notifications: unknown[]; unreadCount: number; pagination: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = { userId };
    if (query.status) {
      where.status = query.status;
    }

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, status: 'UNREAD' } }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { notificationDate: 'desc' },
      }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getNotificationById(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return notification;
  }

  public static async markAsRead(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return prisma.notification.update({
      where: { id },
      data: { status: 'READ' },
    });
  }

  public static async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, status: 'UNREAD' },
      data: { status: 'READ' },
    });

    return { count: result.count };
  }
}
