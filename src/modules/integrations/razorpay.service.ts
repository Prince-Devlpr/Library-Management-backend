import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../../config/env.config.js';
import { logger } from '../../config/logger.js';
import { BusinessRuleError } from '../../utils/errors.js';

export interface CreateOrderParams {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface VerifySignatureParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export class RazorpayService {
  private static instance: Razorpay | null = null;

  public static getClient(): Razorpay {
    if (!this.instance) {
      this.instance = new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      });
    }
    return this.instance;
  }

  /**
   * Creates an order with Razorpay in integer minor units (paise)
   */
  public static async createOrder(params: CreateOrderParams) {
    const { amountPaise, currency = 'INR', receipt, notes = {} } = params;

    if (amountPaise <= 0) {
      throw new BusinessRuleError('Amount in paise must be greater than zero');
    }

    // Check if configured with real key vs test placeholder
    const isPlaceholder = env.RAZORPAY_KEY_ID.includes('placeholder');
    if (isPlaceholder) {
      logger.warn('[Razorpay] Using sandbox mock order generation (credentials not set in .env)');
      return {
        id: `order_${crypto.randomBytes(10).toString('hex')}`,
        entity: 'order',
        amount: amountPaise,
        amount_paid: 0,
        amount_due: amountPaise,
        currency,
        receipt,
        status: 'created',
        attempts: 0,
        notes,
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    try {
      const razorpay = this.getClient();
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency,
        receipt,
        notes,
      });
      return order;
    } catch (error: any) {
      logger.error('[Razorpay] Order creation failed:', error);
      throw new BusinessRuleError(`Failed to create Razorpay order: ${error.message || 'Payment gateway error'}`);
    }
  }

  /**
   * Verifies the HMAC-SHA256 signature sent by the client after checkout
   */
  public static verifyPaymentSignature(params: VerifySignatureParams): boolean {
    const { orderId, paymentId, signature } = params;
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    // If sandbox placeholder is used, allow simulated successful test signatures
    const isPlaceholder = env.RAZORPAY_KEY_ID.includes('placeholder');
    if (isPlaceholder && signature.startsWith('simulated_sig_')) {
      return true;
    }

    try {
      const payload = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(signature, 'utf8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Verifies the Razorpay Webhook signature against raw request body
   */
  public static verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!rawBody || !signature) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(signature, 'utf8')
      );
    } catch {
      return false;
    }
  }
}
