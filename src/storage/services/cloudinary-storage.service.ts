/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';
import {
  IStorageService,
  UploadResult,
  UploadOptions,
} from '../interfaces/storage-service.interface';

// Type for Cloudinary resource response
// interface CloudinaryResource {
//   public_id: string;
//   format: string;
//   version: number;
//   resource_type: string;
//   type: string;
//   created_at: string;
//   bytes: number;
//   width?: number;
//   height?: number;
//   url: string;
//   secure_url: string;
// }

@Injectable()
export class CloudinaryStorageService implements IStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor(private readonly configService: ConfigService) {
    // Configure Cloudinary
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    // Validate configuration
    const missingConfigs: string[] = [];
    if (!cloudName) missingConfigs.push('CLOUDINARY_CLOUD_NAME');
    if (!apiKey) missingConfigs.push('CLOUDINARY_API_KEY');
    if (!apiSecret) missingConfigs.push('CLOUDINARY_API_SECRET');

    if (missingConfigs.length > 0) {
      const errorMsg = `Cloudinary configuration is incomplete. Missing: ${missingConfigs.join(', ')} — service disabled`;
      this.logger.warn(errorMsg);
      return;
    }

    // Initialize Cloudinary (now we know values are not undefined)
    cloudinary.config({
      cloud_name: cloudName!,
      api_key: apiKey!,
      api_secret: apiSecret!,
      secure: true, // Always use HTTPS
    });

    this.logger.log(
      `✅ Cloudinary Storage initialized with cloud: ${cloudName}`,
    );
  }

  async upload(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    try {
      this.logger.log(`Starting Cloudinary upload: ${file.originalname}`);

      // Build folder path
      const folder = options?.folder || 'uploads';

      // Upload to Cloudinary
      const result = await this.uploadToCloudinary(file, folder, options);

      this.logger.log(`✅ File uploaded to Cloudinary: ${result.public_id}`);

      return {
        key: result.public_id,
        url: result.secure_url,
        provider: 'cloudinary',
        size: result.bytes,
        mimeType: file.mimetype,
        originalName: file.originalname,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to upload file to Cloudinary: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async delete(fileKey: string): Promise<void> {
    try {
      this.logger.log(`Deleting file from Cloudinary: ${fileKey}`);

      // Determine resource type from public_id
      const resourceType = this.getResourceType(fileKey);

      await cloudinary.uploader.destroy(fileKey, {
        resource_type: resourceType,
      });

      this.logger.log(`✅ File deleted from Cloudinary: ${fileKey}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to delete file from Cloudinary: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  getUrl(fileKey: string): string {
    // Build Cloudinary URL
    const cloudName = this.configService.get<string>('cloudinary.cloudName');

    // We validated this in constructor, so it's safe to use
    if (!cloudName) {
      throw new Error('Cloudinary cloud name not configured');
    }

    return `https://res.cloudinary.com/${cloudName}/image/upload/${fileKey}`;
  }

  getSignedUrl(
    fileKey: string,
    expiresInSeconds: number = 3600,
  ): Promise<string> {
    try {
      const cloudName = this.configService.get<string>('cloudinary.cloudName');
      const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

      if (!cloudName || !apiSecret) {
        throw new Error('Cloudinary configuration not available');
      }

      // Generate signed URL (synchronous operation)
      const timestamp = Math.round(Date.now() / 1000) + expiresInSeconds;

      const signature = cloudinary.utils.api_sign_request(
        {
          public_id: fileKey,
          timestamp: timestamp,
        },
        apiSecret,
      );

      return Promise.resolve(
        `https://res.cloudinary.com/${cloudName}/image/upload/s--${signature}--/${fileKey}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to generate signed URL: ${errorMessage}`,
        errorStack,
      );
      return Promise.reject(error);
    }
  }

  async exists(fileKey: string): Promise<boolean> {
    try {
      // Try image first (most common)
      try {
        const result = await cloudinary.api.resource(fileKey, {
          resource_type: 'image',
        });
        return !!result;
      } catch (imageError) {
        // If not image, try raw
        try {
          const result = await cloudinary.api.resource(fileKey, {
            resource_type: 'raw',
          });
          return !!result;
        } catch (rawError) {
          // If not found in both, return false
          if (
            imageError.error?.http_code === 404 ||
            rawError.error?.http_code === 404
          ) {
            return false;
          }
          // If other error, throw it
          throw imageError;
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking if file exists: ${error.message}`,
        error.stack,
      );

      // If it's a 404, file doesn't exist
      if (error.error?.http_code === 404 || error.http_code === 404) {
        return false;
      }

      throw error;
    }
  }

  async getStream(fileKey: string): Promise<Readable> {
    try {
      // Cloudinary doesn't support direct streaming
      // We'll fetch the file and return as stream
      const url = this.getUrl(fileKey);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch file from Cloudinary: ${response.statusText}`,
        );
      }

      // Convert web stream to Node.js stream
      const webStream = response.body;
      if (!webStream) {
        throw new Error('No response body');
      }

      // Create readable stream
      const reader = webStream.getReader();
      const stream = new Readable({
        async read() {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        },
      });

      return stream;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to get file stream from Cloudinary: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  getProviderName(): string {
    return 'cloudinary';
  }

  /**
   * Upload file to Cloudinary using upload stream
   */
  private uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
    options?: UploadOptions,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, unknown> = {
        folder: folder,
        resource_type: 'auto', // Auto-detect (image, video, raw)
        format: undefined, // Keep original format
      };

      // Add metadata if provided
      if (options?.metadata) {
        uploadOptions.context = options.metadata;
      }

      // Create upload stream
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            const errorMessage =
              'message' in error ? error.message : 'Upload failed';
            this.logger.error(`Cloudinary upload error: ${errorMessage}`);
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload failed with no result'));
          }
        },
      );

      // Write file buffer to stream
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
  }

  /**
   * Determine resource type from public_id
   */
  private getResourceType(fileKey: string): 'image' | 'video' | 'raw' {
    // Simple detection based on common extensions
    const lowerKey = fileKey.toLowerCase();

    if (lowerKey.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/)) {
      return 'image';
    } else if (lowerKey.match(/\.(mp4|mov|avi|webm|mkv)$/)) {
      return 'video';
    } else {
      return 'raw';
    }
  }

  /**
   * Type guard for Cloudinary errors
   */
  private isCloudinaryError(error: unknown): error is { http_code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'http_code' in error &&
      typeof (error as { http_code: unknown }).http_code === 'number'
    );
  }
}
