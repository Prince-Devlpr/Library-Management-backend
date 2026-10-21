import { Router } from 'express';
import { AuditController } from './audit.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';

const router = Router();

// Only ADMINISTRATOR can view audit logs
router.get('/', authenticate, authorizeRoles('ADMINISTRATOR'), AuditController.getLogs);

export default router;
