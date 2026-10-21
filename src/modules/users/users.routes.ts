import { Router } from 'express';
import { UsersController } from './users.controller.js';
import { AdminUsersController } from './admin-users.controller.js';
import { LibrarianUsersController } from './librarian-users.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import {
  UpdateProfileSchema,
  AdminCreateUserSchema,
  AdminUpdateUserSchema,
  AdminCreateLibrarianSchema,
} from './users.schema.js';

// 1. User Profile Router (/api/v1/users)
export const usersRouter = Router();
usersRouter.use(authenticate);
usersRouter.get('/me', UsersController.getProfile);
usersRouter.patch('/me', validate({ body: UpdateProfileSchema }), UsersController.updateProfile);

// 2. Admin Users Router (/api/v1/admin)
export const adminUsersRouter = Router();
adminUsersRouter.use(authenticate, authorizeRoles('ADMINISTRATOR'));

adminUsersRouter.get('/users', AdminUsersController.getUsers);
adminUsersRouter.get('/users/:id', AdminUsersController.getUserById);
adminUsersRouter.post('/users', validate({ body: AdminCreateUserSchema }), AdminUsersController.createUser);
adminUsersRouter.patch(
  '/users/:id',
  validate({ body: AdminUpdateUserSchema }),
  AdminUsersController.updateUser,
);
adminUsersRouter.post('/users/:id/activate', AdminUsersController.activateUser);
adminUsersRouter.post('/users/:id/deactivate', AdminUsersController.deactivateUser);

adminUsersRouter.post(
  '/librarians',
  validate({ body: AdminCreateLibrarianSchema }),
  AdminUsersController.createLibrarian,
);
adminUsersRouter.patch(
  '/librarians/:id',
  validate({ body: AdminUpdateUserSchema }),
  AdminUsersController.updateUser,
);

// 3. Librarian Users Router (/api/v1/librarian)
export const librarianUsersRouter = Router();
librarianUsersRouter.use(authenticate, authorizeRoles('LIBRARIAN', 'ADMINISTRATOR'));
librarianUsersRouter.get('/users', LibrarianUsersController.searchUsers);
librarianUsersRouter.get('/users/:userId/loans', LibrarianUsersController.getUserLoans);
