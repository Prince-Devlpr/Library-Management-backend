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

  /**
   * Uploads base64 image data directly from file pickers
   */
  public static async uploadImage(req: Request, res: Response) {
    const { image, folder } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: { message: 'Image data is required' } });
    }
    try {
      const uploadResult = await CloudinaryService.uploadImage(image, folder || 'library/book_covers');
      return sendSuccess(res, uploadResult, 'Image uploaded to Cloudinary', 201);
    } catch {
      // Direct data URI fallback if Cloudinary credentials or internet is restricted
      return sendSuccess(res, { url: image, publicId: null }, 'Image saved as data URI', 200);
    }
  }
}
