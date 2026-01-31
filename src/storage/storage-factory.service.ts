import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsStorageService } from './services/aws-storage.service';
import { CloudinaryStorageService } from './services/cloudinary-storage.service';
import { IStorageService } from './interfaces/storage-service.interface';

/**
 * File type categories for routing to appropriate storage provider
 */
export type FileCategory = 'image' | 'document' | 'video' | 'default';

/**
 * Storage Factory Service
 *
 * Routes file uploads to the appropriate storage provider based on:
 * - File category (images → Cloudinary, documents → S3)
 * - Environment configuration
 *
 * Design Pattern: Factory Pattern
 * Abstracts storage provider selection from business logic
 */
@Injectable()
export class StorageFactoryService {
  constructor(
    private readonly configService: ConfigService,
    private readonly awsStorageService: AwsStorageService,
    private readonly cloudinaryStorageService: CloudinaryStorageService,
  ) {}

  /**
   * Get the appropriate storage service based on file category
   *
   * Routing logic:
   * - 'image' → Cloudinary (optimizations, transformations, CDN)
   * - 'video' → Cloudinary (streaming, adaptive bitrate)
   * - 'document' → AWS S3 (cost-effective, signed URLs)
   * - 'default' → Based on STORAGE_PROVIDER env var
   *
   * @param category - The type of file being uploaded
   * @returns IStorageService implementation
   */
  getStorageService(category: FileCategory = 'default'): IStorageService {
    switch (category) {
      case 'image':
        // Cloudinary excels at image optimization and transformations
        return this.cloudinaryStorageService;

      case 'video':
        // Cloudinary handles video streaming and adaptive formats
        return this.cloudinaryStorageService;

      case 'document':
        // S3 is cost-effective for documents with signed URL support
        return this.awsStorageService;

      case 'default':
      default:
        // Fall back to configured default provider
        return this.getDefaultService();
    }
  }

  /**
   * Get storage service by provider name
   *
   * Useful when you need a specific provider regardless of file type
   *
   * @param provider - Provider name: 'cloudinary' | 'aws' | 's3'
   * @returns IStorageService implementation
   */
  getServiceByProvider(provider: string): IStorageService {
    switch (provider.toLowerCase()) {
      case 'cloudinary':
        return this.cloudinaryStorageService;

      case 'aws':
      case 's3':
      case 'aws-s3':
        return this.awsStorageService;

      default:
        return this.getDefaultService();
    }
  }

  /**
   * Get the default storage service based on environment config
   */
  private getDefaultService(): IStorageService {
    const provider = this.configService.get<string>(
      'storage.provider',
      'cloudinary',
    );

    switch (provider.toLowerCase()) {
      case 'cloudinary':
        return this.cloudinaryStorageService;

      case 'aws':
      case 's3':
        return this.awsStorageService;

      default:
        // Default to Cloudinary for general use
        return this.cloudinaryStorageService;
    }
  }

  /**
   * Get all available storage services
   *
   * Useful for health checks or admin dashboards
   */
  getAllServices(): Record<string, IStorageService> {
    return {
      cloudinary: this.cloudinaryStorageService,
      aws: this.awsStorageService,
    };
  }
}
