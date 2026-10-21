import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { PoliciesService } from './policies.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import { UpdatePolicyInput } from './policies.schema.js';

export class PoliciesController {
  public static async getPolicy(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policy = await PoliciesService.getPolicy();
      sendSuccess(res, policy, 'Library policy retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async updatePolicy(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = req.body as UpdatePolicyInput;
      const updated = await PoliciesService.updatePolicy(
        input,
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, updated, 'Library policy updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
