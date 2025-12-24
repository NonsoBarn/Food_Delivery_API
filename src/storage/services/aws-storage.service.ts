import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import {
  IStorageService,
  UploadResult,
  UploadOptions,
} from '../interfaces/storage-service.interface';
import { MulterFile } from '../../common/types/multer.types';

@Injectable()
export class AwsStorageService implements IStorageService {
  private readonly logger = new Logger(AwsStorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('aws.region');
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
    );
    const bucket = this.configService.get<string>('aws.s3.bucket');
    const publicUrl = this.configService.get<string>('aws.s3.publicUrl');

    // Validate required configuration
    if (!region || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      throw new Error('AWS S3 configuration is incomplete');
    }

    // Initialize S3 Client
    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.bucket = bucket;
    this.publicUrl = publicUrl;

    this.logger.log(`AWS S3 Storage initialized with bucket: ${this.bucket}`);
  }

  async upload(
    file: MulterFile,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;

      // Build S3 key (path)
      const folder = options?.folder || 'uploads';
      const key = `${folder}/${fileName}`;

      // Prepare upload command
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: options?.isPublic ? 'public-read' : 'private',
        Metadata: options?.metadata || {},
      });

      // Upload to S3
      await this.s3Client.send(command);

      this.logger.log(`File uploaded to S3: ${key}`);

      // Build public URL
      const url = `${this.publicUrl}/${key}`;

      return {
        key,
        url,
        provider: 'aws-s3',
        size: file.size,
        mimeType: file.mimetype,
        originalName: file.originalname,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to upload file to S3: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: MulterFile): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.originalname) {
      throw new BadRequestException('File must have a name');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }

    if (!file.mimetype) {
      throw new BadRequestException('File must have a MIME type');
    }

    if (file.size <= 0) {
      throw new BadRequestException('File size must be greater than 0');
    }
  }

  async delete(fileKey: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted from S3: ${fileKey}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to delete file from S3: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  getUrl(fileKey: string): string {
    return `${this.publicUrl}/${fileKey}`;
  }

  async getSignedUrl(
    fileKey: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      // Generate signed URL
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      return signedUrl;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to generate signed URL: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async exists(fileKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      // Type-safe error checking for NotFound
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async getStream(fileKey: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      const response = await this.s3Client.send(command);

      // Type guard for Body
      if (!response.Body) {
        throw new Error('No body in S3 response');
      }

      // Check if it's already a Readable stream
      if (response.Body instanceof Readable) {
        return response.Body;
      }

      // Convert AWS SDK stream to Node.js Readable
      return this.convertToReadable(response.Body);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to get file stream from S3: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  getProviderName(): string {
    return 'aws-s3';
  }

  /**
   * Type guard to check if error is a NotFound error
   */
  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name: unknown }).name === 'NotFound'
    );
  }

  /**
   * Convert AWS SDK Body to Node.js Readable stream
   */
  private convertToReadable(body: unknown): Readable {
    // If it's already Readable, return it
    if (body instanceof Readable) {
      return body;
    }

    // If it has transformToWebStream method (AWS SDK v3)
    if (
      typeof body === 'object' &&
      body !== null &&
      'transformToWebStream' in body &&
      typeof (body as { transformToWebStream: unknown })
        .transformToWebStream === 'function'
    ) {
      // For now, throw error - proper implementation requires more setup
      throw new Error(
        'WebStream conversion not yet implemented. Please use Node.js environment.',
      );
    }

    // If it has pipe method (duck typing for streams)
    if (
      typeof body === 'object' &&
      body !== null &&
      'pipe' in body &&
      typeof (body as { pipe: unknown }).pipe === 'function'
    ) {
      // Cast to unknown first, then to Readable (safe because we checked for pipe)
      return body as unknown as Readable;
    }

    throw new Error('Unable to convert Body to Readable stream');
  }
}
