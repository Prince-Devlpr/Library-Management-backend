import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { LoginSchema, RefreshTokenSchema, ChangePasswordSchema } from './auth.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

// Rate limiter for authentication endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 attempts per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Please try again after 15 minutes.',
    },
  },
});

router.post('/login', authLimiter, validate({ body: LoginSchema }), AuthController.login);
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
