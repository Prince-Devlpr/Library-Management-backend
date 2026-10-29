import crypto from 'crypto';
import QRCode from 'qrcode';

export type QrType = 'MEMBER' | 'RESERVATION' | 'COPY' | 'CASH';

export interface ParsedQrPayload {
  type: QrType;
  token: string;
  version: string;
}

export class QrService {
  /**
   * Generates a cryptographically secure opaque token with high entropy
   */
  public static generateOpaqueToken(prefix: string = 'tok'): string {
    const randomHex = crypto.randomBytes(24).toString('hex');
    return `${prefix}_${randomHex}`;
  }

  /**
   * Generates a short human-readable 6-character fallback pickup code (e.g. "RES-7492")
   */
  public static generatePickupCode(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `RES-${num}`;
  }

  /**
   * Formats a standardized payload string for QR encoding
   * Examples:
   * Member:      lms:v1:m:tok_a8f9c...
   * Reservation: lms:v1:r:tok_9b2e1...
   * Book Copy:   lms:v1:c:BC-100234
   * Cash Voucher: lms:v1:cash:CASH-7492
   */
  public static formatPayload(type: QrType, identifier: string): string {
    const typeCode =
      type === 'MEMBER' ? 'm' : type === 'RESERVATION' ? 'r' : type === 'COPY' ? 'c' : 'cash';
    return `lms:v1:${typeCode}:${identifier}`;
  }

  /**
   * Safely parses an incoming QR scan string or keyboard-wedge input
   */
  public static parsePayload(rawInput: string): ParsedQrPayload | null {
    if (!rawInput || typeof rawInput !== 'string') return null;
    const trimmed = rawInput.trim();

    // Check versioned LMS format: lms:v1:<typeCode>:<token>
    const match = trimmed.match(/^lms:v1:(m|r|c|cash):(.+)$/i);
    if (match) {
      const typeCode = match[1].toLowerCase();
      const token = match[2];
      const type: QrType =
        typeCode === 'm'
          ? 'MEMBER'
          : typeCode === 'r'
            ? 'RESERVATION'
            : typeCode === 'c'
              ? 'COPY'
              : 'CASH';
      return { type, token, version: 'v1' };
    }

    // Direct token fallback (e.g., raw barcode "BC-100234", raw voucher "CASH-7492", or reservation)
    if (trimmed.startsWith('CASH-')) {
      return { type: 'CASH', token: trimmed, version: 'legacy' };
    }
    if (trimmed.startsWith('BC-') || trimmed.length < 20) {
      return { type: 'COPY', token: trimmed, version: 'legacy' };
    }
    if (trimmed.startsWith('RES-')) {
      return { type: 'RESERVATION', token: trimmed, version: 'legacy' };
    }

    return null;
  }

  /**
   * Generates a PNG Data URL representing the QR code
   */
  public static async generateDataUrl(payload: string, options?: QRCode.QRCodeToDataURLOptions): Promise<string> {
    return QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      ...options,
    });
  }

  /**
   * Generates an SVG string representing the QR code for label printing
   */
  public static async generateSvg(payload: string): Promise<string> {
    return QRCode.toString(payload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
    });
  }
}
