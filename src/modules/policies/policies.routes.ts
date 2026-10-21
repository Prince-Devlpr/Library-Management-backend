import { Router } from 'express';
import { PoliciesController } from './policies.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { UpdatePolicySchema } from './policies.schema.js';

const router = Router();
router.use(authenticate);

// View policy (Admin, Librarian, User)
router.get('/', PoliciesController.getPolicy);

// Update policy (Admin only)
router.patch(
  '/',
  authorizeRoles('ADMINISTRATOR'),
  validate({ body: UpdatePolicySchema }),
  PoliciesController.updatePolicy,
);

export default router;
