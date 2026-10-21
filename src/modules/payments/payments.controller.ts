import { Response } from 'express';
import { PaymentsService } from './payments.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import { UnauthorizedError, BusinessRuleError } from '../../utils/errors.js';
import { AuthenticatedRequest } from '../../types/index.js';

export class PaymentsController {
  public static async getGatewayStatus(_req: any, res: Response) {
    const status = await PaymentsService.getGatewayStatus();
    return sendSuccess(res, status, 'Gateway status retrieved successfully');
  }

  public static async requestCashSlip(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError();

    const { fineId } = req.body;
    if (!fineId) throw new BusinessRuleError('fineId is required');

    const slip = await PaymentsService.requestCashSlip(userId, fineId);
    return sendSuccess(res, slip, 'Cash slip generated successfully', 201);
  }

  public static async createOrder(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError();

    const { fineId, bookId, type } = req.body;
    if (fineId) {
      const orderData = await PaymentsService.createFinePaymentOrder(userId, fineId);
      return sendSuccess(res, orderData, 'Razorpay order created successfully for fine', 201);
    } else if (bookId || type === 'RESERVATION') {
      const targetBookId = bookId;
      if (!targetBookId) throw new BusinessRuleError('bookId is required for reservation deposit order');
      const orderData = await PaymentsService.createReservationPaymentOrder(userId, targetBookId);
      return sendSuccess(res, orderData, 'Razorpay order created successfully for reservation deposit', 201);
    } else {
      throw new BusinessRuleError('fineId or bookId is required to create payment order');
    }
  }

  public static async createReservationOrder(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError();

    const { bookId } = req.body;
    if (!bookId) throw new BusinessRuleError('bookId is required');

    const orderData = await PaymentsService.createReservationPaymentOrder(userId, bookId);
    return sendSuccess(res, orderData, 'Razorpay reservation deposit order created successfully', 201);
  }

  public static async verifyPayment(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError();

    const { orderId, paymentId, signature } = req.body;
    if (!orderId || !paymentId || !signature) {
      throw new BusinessRuleError('orderId, paymentId, and signature are required');
    }

    const settled = await PaymentsService.verifyAndSettlePayment(
      userId,
      { orderId, paymentId, signature },
      req.ip,
      req.headers['user-agent'] as string,
    );

    return sendSuccess(res, settled, 'Payment verified and settled successfully');
  }

  public static async recordCounterPayment(req: AuthenticatedRequest, res: Response) {
    const staffId = req.user?.id;
    if (!staffId) throw new UnauthorizedError();

    const { fineId, notes } = req.body;
    if (!fineId) throw new BusinessRuleError('fineId is required');

    const payment = await PaymentsService.recordCounterPayment(
      staffId,
      fineId,
      notes,
      req.ip,
      req.headers['user-agent'] as string,
    );

    return sendSuccess(res, payment, 'Counter payment recorded successfully', 201);
  }

  public static async getReceipt(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) throw new UnauthorizedError();

    const { receiptNumber } = req.params;
    const receipt = await PaymentsService.getReceipt(receiptNumber, userId, role);

    return sendSuccess(res, receipt);
  }
}
