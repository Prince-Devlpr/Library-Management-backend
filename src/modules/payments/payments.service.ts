import { prisma } from '../../config/database.js';
import { RazorpayService } from '../integrations/razorpay.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { NotFoundError, ForbiddenError, ConflictError, BusinessRuleError } from '../../utils/errors.js';

export class PaymentsService {
  /**
   * Generates a unique human-friendly receipt number, e.g., REC-202610-8492
   */
  public static generateReceiptNumber(): string {
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `REC-${datePrefix}-${rand}`;
  }

  /**
   * Checks whether the Razorpay online gateway is configured and active
   */
  public static async getGatewayStatus() {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const hasValidKey = Boolean(keyId && !keyId.includes('placeholder'));

    return {
      onlineGatewayEnabled: hasValidKey,
      gatewayProvider: 'RAZORPAY',
      keyId: hasValidKey ? keyId : null,
      currency: 'INR',
      supportedMethods: [
        {
          id: 'RAZORPAY',
          name: 'Online Payment (UPI, Cards, NetBanking)',
          enabled: hasValidKey,
          description: 'Instant online settlement via Razorpay secure checkout',
        },
        {
          id: 'CASH_COUNTER',
          name: 'Physical Cash at Counter',
          enabled: true,
          description: 'Generate cash slip and pay in person to librarian',
        },
      ],
    };
  }

  /**
   * Generates a digital Cash Slip for patrons wishing to pay fines with physical cash at the counter
   */
  public static async requestCashSlip(userId: string, fineId: string) {
    const fine = await prisma.fine.findUnique({
      where: { id: fineId },
      include: {
        loan: {
          include: {
            user: true,
            copy: { include: { book: true } },
          },
        },
      },
    });

    if (!fine) {
      throw new NotFoundError('Fine record not found');
    }

    if (fine.loan.userId !== userId) {
      throw new ForbiddenError('You can only generate cash slips for your own library fines');
    }

    if (fine.paymentStatus === 'PAID') {
      throw new ConflictError('This fine has already been settled', 'FINE_ALREADY_PAID');
    }

    const amountPaise = fine.amountPaise > 0 
      ? fine.amountPaise 
      : Math.round(Number(fine.amount) * 100);

    const slipCode = `CASH-${Math.floor(1000 + Math.random() * 9000)}`;
    const receiptNumber = this.generateReceiptNumber();

    // Check if pending cash slip already exists
    const existing = await prisma.payment.findFirst({
      where: {
        fineId,
        method: 'CASH_COUNTER',
        status: 'PENDING',
      },
    });

    if (existing) {
      const existingSlip = (existing.notes as any)?.slipCode || slipCode;
      return {
        paymentId: existing.id,
        slipCode: existingSlip,
        receiptNumber: existing.receiptNumber,
        fineId,
        amountPaise,
        amountRupees: (amountPaise / 100).toFixed(2),
        bookTitle: fine.loan.copy.book.title,
        patronName: fine.loan.user.name,
        patronId: fine.loan.user.registrationNumber,
        instructions: 'Present this slip code or voucher at the circulation counter to complete cash payment.',
      };
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        fineId,
        amountPaise,
        currency: 'INR',
        method: 'CASH_COUNTER',
        status: 'PENDING',
        receiptNumber,
        notes: {
          slipCode,
          bookTitle: fine.loan.copy.book.title,
        },
      },
    });

    return {
      paymentId: payment.id,
      slipCode,
      receiptNumber,
      fineId,
      amountPaise,
      amountRupees: (amountPaise / 100).toFixed(2),
      bookTitle: fine.loan.copy.book.title,
      patronName: fine.loan.user.name,
      patronId: fine.loan.user.registrationNumber,
      instructions: 'Present this slip code or voucher at the circulation counter to complete cash payment.',
    };
  }

  /**
   * Creates a Razorpay order for online book reservation holding deposit (₹20.00 / 2000 paise)
   */
  public static async createReservationPaymentOrder(userId: string, bookId: string) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        copies: {
          where: { status: 'AVAILABLE' },
          take: 1,
        },
      },
    });

    if (!book) {
      throw new NotFoundError('Book not found');
    }

    if (book.copies.length === 0) {
      throw new ConflictError('There are no available copies of this book to reserve', 'NO_COPIES_AVAILABLE');
    }

    const amountPaise = 2000; // ₹20.00 holding deposit
    const receiptNumber = this.generateReceiptNumber();

    const order = await RazorpayService.createOrder({
      amountPaise,
      receipt: receiptNumber,
      notes: {
        type: 'RESERVATION_HOLD_DEPOSIT',
        bookId: book.id,
        bookTitle: book.title,
        userId,
      },
    });

    return {
      orderId: order.id,
      amountPaise,
      amountRupees: (amountPaise / 100).toFixed(2),
      currency: 'INR',
      receiptNumber,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
      bookTitle: book.title,
      type: 'RESERVATION_HOLD_DEPOSIT',
    };
  }

  /**
   * Creates a Razorpay order for settling an outstanding fine
   */
  public static async createFinePaymentOrder(userId: string, fineId: string) {
    const fine = await prisma.fine.findUnique({
      where: { id: fineId },
      include: {
        loan: {
          include: {
            user: true,
            copy: { include: { book: true } },
          },
        },
      },
    });

    if (!fine) {
      throw new NotFoundError('Fine record not found');
    }

    if (fine.loan.userId !== userId) {
      throw new ForbiddenError('You can only pay your own library fines');
    }

    if (fine.paymentStatus === 'PAID') {
      throw new ConflictError('This fine has already been settled', 'FINE_ALREADY_PAID');
    }

    // Convert decimal or paise
    const amountPaise = fine.amountPaise > 0 
      ? fine.amountPaise 
      : Math.round(Number(fine.amount) * 100);

    if (amountPaise <= 0) {
      throw new BusinessRuleError('Fine amount must be greater than zero');
    }

    const receiptNumber = this.generateReceiptNumber();

    // Create order with Razorpay
    const order = await RazorpayService.createOrder({
      amountPaise,
      receipt: receiptNumber,
      notes: {
        fineId: fine.id,
        loanId: fine.loanId,
        userId: fine.loan.userId,
        bookTitle: fine.loan.copy.book.title,
      },
    });

    // Create pending payment tracking record
    const payment = await prisma.payment.create({
      data: {
        userId,
        fineId: fine.id,
        amountPaise,
        currency: 'INR',
        method: 'RAZORPAY',
        status: 'PENDING',
        razorpayOrderId: order.id,
        receiptNumber,
        notes: {
          bookTitle: fine.loan.copy.book.title,
          barcode: fine.loan.copy.barcode,
        },
      },
    });

    return {
      orderId: order.id,
      amountPaise,
      currency: 'INR',
      receiptNumber,
      paymentId: payment.id,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
      bookTitle: fine.loan.copy.book.title,
      amountRupees: (amountPaise / 100).toFixed(2),
    };
  }

  /**
   * Verifies Razorpay signature and finalizes payment transaction
   */
  public static async verifyAndSettlePayment(
    userId: string,
    params: { orderId: string; paymentId: string; signature: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { orderId, paymentId, signature } = params;

    const isValid = RazorpayService.verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      throw new BusinessRuleError('Invalid Razorpay payment signature', 'PAYMENT_SIGNATURE_INVALID');
    }

    const paymentRecord = await prisma.payment.findUnique({
      where: { razorpayOrderId: orderId },
      include: {
        fine: {
          include: {
            loan: {
              include: {
                copy: { include: { book: true } },
              },
            },
          },
        },
      },
    });

    if (!paymentRecord) {
      throw new NotFoundError('Payment order not found');
    }

    if (paymentRecord.userId !== userId) {
      throw new ForbiddenError('Payment does not belong to current user');
    }

    if (paymentRecord.status === 'SUCCESS') {
      return paymentRecord; // Idempotent return
    }

    // Single atomic transaction to settle fine and mark payment
    const settled = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      });

      await tx.fine.update({
        where: { id: paymentRecord.fineId },
        data: {
          paymentStatus: 'PAID',
          paymentDate: new Date(),
        },
      });

      return updatedPayment;
    });

    // Notify user
    await NotificationService.createNotification({
      userId,
      message: `Payment of ₹${(paymentRecord.amountPaise / 100).toFixed(2)} received for "${paymentRecord.fine.loan.copy.book.title}". Receipt: ${paymentRecord.receiptNumber}`,
      type: 'FINE_PAYMENT_SUCCESS',
    });

    await AuditService.log({
      userId,
      action: 'PAYMENT_VERIFIED_RAZORPAY',
      entityType: 'PAYMENT',
      entityId: settled.id,
      details: {
        fineId: paymentRecord.fineId,
        amountPaise: paymentRecord.amountPaise,
        receiptNumber: paymentRecord.receiptNumber,
        razorpayPaymentId: paymentId,
      },
      ipAddress,
      userAgent,
    });

    return settled;
  }

  /**
   * Cash / Counter payment recorded by authorized staff
   */
  public static async recordCounterPayment(
    staffId: string,
    fineIdOrSlipCode: string,
    notes?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    let fine = await prisma.fine.findUnique({
      where: { id: fineIdOrSlipCode },
      include: {
        loan: {
          include: {
            user: true,
            copy: { include: { book: true } },
          },
        },
      },
    });

    if (!fine) {
      // Find by cash slip voucher code or receipt number
      const pendingPayment = await prisma.payment.findFirst({
        where: {
          OR: [
            { receiptNumber: fineIdOrSlipCode },
            { id: fineIdOrSlipCode },
          ],
        },
        include: {
          fine: {
            include: {
              loan: {
                include: {
                  user: true,
                  copy: { include: { book: true } },
                },
              },
            },
          },
        },
      });

      if (pendingPayment?.fine) {
        fine = pendingPayment.fine;
      }
    }

    if (!fine) throw new NotFoundError('Fine record or cash slip not found');
    if (fine.paymentStatus === 'PAID') {
      throw new ConflictError('Fine is already paid', 'FINE_ALREADY_PAID');
    }

    const amountPaise = fine.amountPaise > 0
      ? fine.amountPaise
      : Math.round(Number(fine.amount) * 100);

    const receiptNumber = this.generateReceiptNumber();

    const result = await prisma.$transaction(async (tx) => {
      // Check if a pending cash slip payment already exists
      const existingPending = await tx.payment.findFirst({
        where: {
          fineId: fine.id,
          method: 'CASH_COUNTER',
          status: 'PENDING',
        },
      });

      let payment;
      if (existingPending) {
        payment = await tx.payment.update({
          where: { id: existingPending.id },
          data: {
            status: 'SUCCESS',
            notes: {
              ...(typeof existingPending.notes === 'object' && existingPending.notes ? existingPending.notes : {}),
              recordedByStaffId: staffId,
              staffNote: notes || 'Counter cash settlement',
            },
          },
        });
      } else {
        payment = await tx.payment.create({
          data: {
            userId: fine.loan.userId,
            fineId: fine.id,
            amountPaise,
            currency: 'INR',
            method: 'CASH_COUNTER',
            status: 'SUCCESS',
            receiptNumber,
            notes: {
              recordedByStaffId: staffId,
              staffNote: notes || 'Counter cash settlement',
              bookTitle: fine.loan.copy.book.title,
            },
          },
        });
      }

      await tx.fine.update({
        where: { id: fine.id },
        data: {
          paymentStatus: 'PAID',
          paymentDate: new Date(),
        },
      });

      return payment;
    });

    await NotificationService.createNotification({
      userId: fine.loan.userId,
      message: `Counter payment of ₹${(amountPaise / 100).toFixed(2)} recorded for "${fine.loan.copy.book.title}". Receipt: ${receiptNumber}`,
      type: 'FINE_PAYMENT_SUCCESS',
    });

    await AuditService.log({
      userId: staffId,
      action: 'PAYMENT_RECORDED_COUNTER',
      entityType: 'PAYMENT',
      entityId: result.id,
      details: {
        fineId: fine.id,
        patronId: fine.loan.userId,
        amountPaise,
        receiptNumber,
      },
      ipAddress,
      userAgent,
    });

    return result;
  }

  /**
   * Returns a complete digital receipt
   */
  public static async getReceipt(receiptNumberOrId: string, requestingUserId: string, role: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { receiptNumber: receiptNumberOrId },
          { id: receiptNumberOrId },
        ],
      },
      include: {
        user: { select: { id: true, name: true, registrationNumber: true, email: true } },
        fine: {
          include: {
            loan: {
              include: {
                copy: {
                  include: { book: true },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) throw new NotFoundError('Receipt not found');

    if (role === 'USER' && payment.userId !== requestingUserId) {
      throw new ForbiddenError('You can only view your own receipts');
    }

    return {
      receiptNumber: payment.receiptNumber,
      date: payment.createdAt,
      status: payment.status,
      method: payment.method,
      amountPaise: payment.amountPaise,
      amountRupees: (payment.amountPaise / 100).toFixed(2),
      currency: payment.currency,
      patron: payment.user,
      transactionId: payment.razorpayPaymentId || payment.id,
      book: {
        title: payment.fine.loan.copy.book.title,
        author: payment.fine.loan.copy.book.author,
        isbn: payment.fine.loan.copy.book.isbn,
        barcode: payment.fine.loan.copy.barcode,
      },
      loanDates: {
        issued: payment.fine.loan.issueDate,
        returned: payment.fine.loan.returnDate,
        due: payment.fine.loan.dueDate,
      },
    };
  }
}
