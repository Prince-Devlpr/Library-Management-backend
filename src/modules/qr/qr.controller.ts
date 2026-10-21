import { Response } from 'express';
import { prisma } from '../../config/database.js';
import { QrService } from './qr.service.js';
import { NotFoundError, UnauthorizedError, BusinessRuleError } from '../../utils/errors.js';
import { sendSuccess } from '../../utils/response.util.js';
import { AuthenticatedRequest } from '../../types/index.js';

export class QrController {
  /**
   * GET /api/v1/qr/member/card
   * Returns current user's digital member library-card QR
   */
  public static async getMemberCard(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError();

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        email: true,
        role: true,
        status: true,
        cardQrToken: true,
      },
    });

    if (!user) throw new NotFoundError('User not found');

    // Generate token if not yet created
    if (!user.cardQrToken) {
      const newToken = QrService.generateOpaqueToken('mem');
      user = await prisma.user.update({
        where: { id: userId },
        data: { cardQrToken: newToken },
        select: {
          id: true,
          name: true,
          registrationNumber: true,
          email: true,
          role: true,
          status: true,
          cardQrToken: true,
        },
      });
    }

    const payload = QrService.formatPayload('MEMBER', user.cardQrToken!);
    const qrDataUrl = await QrService.generateDataUrl(payload);

    return sendSuccess(res, {
      user: {
        id: user.id,
        name: user.name,
        registrationNumber: user.registrationNumber,
        status: user.status,
      },
      qr: {
        payload,
        token: user.cardQrToken,
        dataUrl: qrDataUrl,
      },
    });
  }

  /**
   * POST /api/v1/qr/member/regenerate
   * Invalidates existing card token and generates a fresh one
   */
  public static async regenerateMemberCard(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError();

    const newToken = QrService.generateOpaqueToken('mem');
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { cardQrToken: newToken },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        cardQrToken: true,
      },
    });

    const payload = QrService.formatPayload('MEMBER', newToken);
    const qrDataUrl = await QrService.generateDataUrl(payload);

    return sendSuccess(res, {
      message: 'Library card QR code successfully regenerated',
      token: updated.cardQrToken,
      qr: {
        payload,
        dataUrl: qrDataUrl,
      },
    });
  }

  /**
   * GET /api/v1/qr/copy/:barcode
   * Returns QR data & SVG label for physical copy
   */
  public static async getCopyQr(req: AuthenticatedRequest, res: Response) {
    const { barcode } = req.params;
    const copy = await prisma.bookCopy.findUnique({
      where: { barcode },
      include: { book: true },
    });

    if (!copy) throw new NotFoundError('Book copy not found');

    const payload = QrService.formatPayload('COPY', copy.barcode);
    const qrDataUrl = await QrService.generateDataUrl(payload);
    const qrSvg = await QrService.generateSvg(payload);

    return sendSuccess(res, {
      copy: {
        id: copy.id,
        barcode: copy.barcode,
        shelfLocation: copy.shelfLocation,
        status: copy.status,
        title: copy.book.title,
        author: copy.book.author,
        isbn: copy.book.isbn,
      },
      qr: {
        payload,
        dataUrl: qrDataUrl,
        svg: qrSvg,
      },
    });
  }

  /**
   * GET /api/v1/qr/reservation/:id
   * Returns reservation QR code & countdown information
   */
  public static async getReservationQr(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        copy: { include: { book: true } },
        user: { select: { id: true, name: true, registrationNumber: true } },
      },
    });

    if (!reservation) throw new NotFoundError('Reservation not found');

    if (req.user?.role === 'USER' && reservation.userId !== req.user.id) {
      throw new UnauthorizedError('Access denied to this reservation');
    }

    let token = reservation.qrToken;
    let pickupCode = reservation.pickupCode;

    if (!token || !pickupCode) {
      token = token || QrService.generateOpaqueToken('res');
      pickupCode = pickupCode || QrService.generatePickupCode();
      await prisma.reservation.update({
        where: { id },
        data: { qrToken: token, pickupCode },
      });
    }

    const payload = QrService.formatPayload('RESERVATION', token);
    const qrDataUrl = await QrService.generateDataUrl(payload);

    const now = new Date();
    const isExpired = now.getTime() > new Date(reservation.expiryDate).getTime();
    const remainingMs = Math.max(0, new Date(reservation.expiryDate).getTime() - now.getTime());

    return sendSuccess(res, {
      reservation: {
        id: reservation.id,
        status: isExpired && reservation.status === 'ACTIVE' ? 'EXPIRED' : reservation.status,
        expiryDate: reservation.expiryDate,
        remainingMs,
        pickupCode,
        book: {
          title: reservation.copy.book.title,
          author: reservation.copy.book.author,
          coverUrl: reservation.copy.book.coverUrl,
        },
        copy: {
          barcode: reservation.copy.barcode,
          shelfLocation: reservation.copy.shelfLocation,
        },
      },
      qr: {
        payload,
        dataUrl: qrDataUrl,
      },
    });
  }

  /**
   * POST /api/v1/qr/resolve
   * Resolves scanned string or token into entity details (Librarian counter workflow)
   */
  public static async resolveScan(req: AuthenticatedRequest, res: Response) {
    const { rawInput } = req.body;
    if (!rawInput) throw new BusinessRuleError('rawInput is required');

    const parsed = QrService.parsePayload(rawInput);
    if (!parsed) {
      throw new BusinessRuleError('Invalid QR format or unknown barcode');
    }

    if (parsed.type === 'MEMBER') {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { cardQrToken: parsed.token },
            { registrationNumber: parsed.token },
          ],
        },
        select: {
          id: true,
          name: true,
          registrationNumber: true,
          email: true,
          status: true,
          role: true,
          loans: {
            where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
            include: { copy: { include: { book: true } } },
          },
          reservations: {
            where: { status: 'ACTIVE' },
            include: { copy: { include: { book: true } } },
          },
        },
      });

      if (!user) throw new NotFoundError('Member not found for scanned QR');
      return sendSuccess(res, { entityType: 'MEMBER', data: user });
    }

    if (parsed.type === 'COPY') {
      const copy = await prisma.bookCopy.findUnique({
        where: { barcode: parsed.token },
        include: {
          book: true,
          loans: {
            where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
            include: { user: { select: { id: true, name: true, registrationNumber: true } } },
          },
          reservations: {
            where: { status: 'ACTIVE' },
            include: { user: { select: { id: true, name: true, registrationNumber: true } } },
          },
        },
      });

      if (!copy) throw new NotFoundError('Physical copy not found for scanned barcode');
      return sendSuccess(res, { entityType: 'COPY', data: copy });
    }

    if (parsed.type === 'RESERVATION') {
      const reservation = await prisma.reservation.findFirst({
        where: {
          OR: [
            { qrToken: parsed.token },
            { pickupCode: parsed.token },
            { id: parsed.token },
          ],
        },
        include: {
          user: { select: { id: true, name: true, registrationNumber: true } },
          copy: { include: { book: true } },
        },
      });

      if (!reservation) throw new NotFoundError('Reservation not found for scanned QR');
      return sendSuccess(res, { entityType: 'RESERVATION', data: reservation });
    }

    throw new BusinessRuleError('Unsupported QR entity type');
  }
}
