import { Router } from 'express';
import { NotificationsController } from './notifications.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', NotificationsController.getUserNotifications);
router.patch('/read-all', NotificationsController.markAllAsRead);
router.get('/:id', NotificationsController.getNotificationById);
router.patch('/:id/read', NotificationsController.markAsRead);

export default router;
