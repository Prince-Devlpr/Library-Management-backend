import { prisma } from '../../config/database.js';
import {
  NotFoundError,
  ConflictError,
  BusinessRuleError,
} from '../../utils/errors.js';
import { hashPassword } from '../../utils/password.util.js';
import { AuditService } from '../audit/audit.service.js';
import {
  UpdateProfileInput,
  AdminCreateUserInput,
  AdminUpdateUserInput,
  AdminCreateLibrarianInput,
} from './users.schema.js';
import { PaginationMeta, Role } from '../../types/index.js';
import { Prisma } from '@prisma/client';

export class UsersService {
  public static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        registrationDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return user;
  }

  public static async updateProfile(
    userId: string,
    input: UpdateProfileInput,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (input.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: input.email.toLowerCase().trim(),
          NOT: { id: userId },
        },
      });
      if (existing) {
        throw new ConflictError('Email address is already in use by another account');
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name?.trim(),
        phoneNumber: input.phoneNumber?.trim(),
        email: input.email ? input.email.toLowerCase().trim() : undefined,
      },
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await AuditService.log({
      userId,
      action: 'USER_PROFILE_UPDATED',
      entityType: 'USER',
      entityId: userId,
      details: { updatedFields: Object.keys(input) },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  // Admin Methods
  public static async adminGetUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: Role;
    status?: 'ACTIVE' | 'INACTIVE';
  }): Promise<{ users: unknown[]; pagination: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { registrationNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          registrationNumber: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          registrationDate: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async adminGetUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        registrationDate: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            loans: true,
            reservations: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  public static async adminCreateUser(
    input: AdminCreateUserInput,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new ConflictError('A user with this email address already exists');
    }

    const existingReg = await prisma.user.findUnique({
      where: { registrationNumber: input.registrationNumber.trim() },
    });
    if (existingReg) {
      throw new ConflictError('A user with this registration number already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        registrationNumber: input.registrationNumber.trim(),
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        phoneNumber: input.phoneNumber.trim(),
        passwordHash,
        role: input.role,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await AuditService.log({
      userId: adminId,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: user.id,
      details: { role: user.role, email: user.email },
      ipAddress,
      userAgent,
    });

    return user;
  }

  public static async adminUpdateUser(
    id: string,
    input: AdminUpdateUserInput,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (input.email && input.email.toLowerCase().trim() !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase().trim() },
      });
      if (existing) {
        throw new ConflictError('Email is already in use');
      }
    }

    // Protect last active administrator
    if (user.role === 'ADMINISTRATOR') {
      if (input.status === 'INACTIVE' || (input.role && input.role !== 'ADMINISTRATOR')) {
        const activeAdminCount = await prisma.user.count({
          where: { role: 'ADMINISTRATOR', status: 'ACTIVE' },
        });
        if (activeAdminCount <= 1) {
          throw new BusinessRuleError(
            'Cannot deactivate or change the role of the last active administrator.',
            'LAST_ADMIN_PROTECTION',
          );
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        email: input.email ? input.email.toLowerCase().trim() : undefined,
        phoneNumber: input.phoneNumber?.trim(),
        role: input.role,
        status: input.status,
      },
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await AuditService.log({
      userId: adminId,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      details: { updatedFields: Object.keys(input) },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  public static async adminSetUserStatus(
    id: string,
    status: 'ACTIVE' | 'INACTIVE',
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (status === 'INACTIVE' && user.role === 'ADMINISTRATOR') {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMINISTRATOR', status: 'ACTIVE' },
      });
      if (activeAdminCount <= 1) {
        throw new BusinessRuleError(
          'Cannot deactivate the last active administrator account.',
          'LAST_ADMIN_PROTECTION',
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    // If deactivating, revoke all active sessions immediately
    if (status === 'INACTIVE') {
      await prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await AuditService.log({
      userId: adminId,
      action: status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: id,
      details: { targetStatus: status },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  public static async adminCreateLibrarian(
    input: AdminCreateLibrarianInput,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.adminCreateUser(
      {
        ...input,
        role: 'LIBRARIAN',
      },
      adminId,
      ipAddress,
      userAgent,
    );
  }

  // Librarian Methods
  public static async librarianSearchUsers(query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { registrationNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          registrationNumber: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          registrationDate: true,
        },
      }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async librarianGetUserLoans(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const loans = await prisma.loan.findMany({
      where: { userId },
      orderBy: { issueDate: 'desc' },
      include: {
        copy: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                isbn: true,
              },
            },
          },
        },
        fine: true,
      },
    });

    return { user: { id: user.id, name: user.name, registrationNumber: user.registrationNumber }, loans };
  }
}
