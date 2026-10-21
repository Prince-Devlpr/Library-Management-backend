import { prisma } from '../../config/database.js';
import { AuditService } from '../audit/audit.service.js';
import { UpdatePolicyInput } from './policies.schema.js';
import { Prisma } from '@prisma/client';

export class PoliciesService {
  public static async getPolicy() {
    let policy = await prisma.libraryPolicy.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: {
        updater: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!policy) {
      policy = await prisma.libraryPolicy.create({
        data: {
          borrowLimit: 3,
          loanDuration: 14,
          reservationPeriod: 3,
          finePerDay: new Prisma.Decimal(1.0),
          maxRenewals: 2,
        },
        include: {
          updater: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }

    return policy;
  }

  public static async updatePolicy(
    input: UpdatePolicyInput,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const current = await this.getPolicy();

    const updated = await prisma.libraryPolicy.update({
      where: { id: current.id },
      data: {
        borrowLimit: input.borrowLimit,
        loanDuration: input.loanDuration,
        reservationPeriod: input.reservationPeriod,
        finePerDay: input.finePerDay !== undefined ? new Prisma.Decimal(input.finePerDay) : undefined,
        maxRenewals: input.maxRenewals,
        updatedBy: adminId,
      },
      include: {
        updater: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await AuditService.log({
      userId: adminId,
      action: 'POLICY_UPDATED',
      entityType: 'LIBRARY_POLICY',
      entityId: updated.id,
      details: { previous: current, updated: input },
      ipAddress,
      userAgent,
    });

    return updated;
  }
}
