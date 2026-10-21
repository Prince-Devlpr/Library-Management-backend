import { Router } from 'express';
import { ReportsController } from './reports.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';

const router = Router();

// Reports are Administrator only
router.use(authenticate, authorizeRoles('ADMINISTRATOR'));

router.get('/circulation', ReportsController.getCirculationReport);
router.get('/overdue', ReportsController.getOverdueReport);
router.get('/fines', ReportsController.getFineReport);
router.get('/borrowing-statistics', ReportsController.getBorrowingStatistics);

export default router;
