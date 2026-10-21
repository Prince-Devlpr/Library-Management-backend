import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env.config.js';
import { logger } from '../../config/logger.js';

export class CloudinaryService {
  private static configured = false;

  private static configure() {
    if (!this.configured) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
      this.configured = true;
    }
  }

  /**
   * Generates a signed upload signature so clients can securely upload directly to Cloudinary
   * without exposing API secrets
   */
  public static generateUploadSignature(folder: string = 'library/book_covers') {
    this.configure();
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign: Record<string, any> = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      env.CLOUDINARY_API_SECRET
    );

    return {
      timestamp,
      folder,
      signature,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    };
  }

  /**
   * Deletes an asset from Cloudinary when a book cover is replaced or deleted
   */
  public static async deleteAsset(publicId: string): Promise<boolean> {
    if (!publicId) return false;
    this.configure();

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info(`[Cloudinary] Asset ${publicId} deletion result:`, result);
      return result.result === 'ok';
    } catch (error) {
      logger.error(`[Cloudinary] Failed to delete asset ${publicId}:`, error);
      return false;
    }
  }
}
