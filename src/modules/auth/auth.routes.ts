import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { LoginSchema, RefreshTokenSchema, ChangePasswordSchema } from './auth.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/login', validate({ body: LoginSchema }), AuthController.login);
router.post('/refresh', validate({ body: RefreshTokenSchema }), AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);
router.post(
  '/change-password',
  authenticate,
  validate({ body: ChangePasswordSchema }),
  AuthController.changePassword,
);

export default router;
