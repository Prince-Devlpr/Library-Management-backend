import { Router } from 'express';
import { UploadsController } from './uploads.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';

export const uploadsRouter = Router();

// Librarians and Admins can get upload signatures for book covers
uploadsRouter.get(
  '/signature',
  authenticate,
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  UploadsController.getUploadSignature
);

uploadsRouter.post(
  '/image',
  authenticate,
  authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'),
  UploadsController.uploadImage
);
