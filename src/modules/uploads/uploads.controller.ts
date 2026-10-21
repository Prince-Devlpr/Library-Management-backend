import { Request, Response } from 'express';
import { CloudinaryService } from '../integrations/cloudinary.service.js';
import { sendSuccess } from '../../utils/response.util.js';

export class UploadsController {
  /**
   * Generates a signed payload for secure direct upload to Cloudinary
   */
  public static async getUploadSignature(req: Request, res: Response) {
    const folder = (req.query.folder as string) || 'library/book_covers';
    const signatureData = CloudinaryService.generateUploadSignature(folder);
    return sendSuccess(res, signatureData);
  }
}
