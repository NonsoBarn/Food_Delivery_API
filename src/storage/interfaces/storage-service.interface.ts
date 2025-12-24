import { Readable } from 'stream';
import { MulterFile } from '../../common/types/multer.types';

/**
 * File upload result
 */
export interface UploadResult {
  key: string; // Unique identifier (filename or path)
  url: string; // Public URL to access file
  provider: string; // Which provider was used
  size: number; // File size in bytes
  mimeType: string; // File MIME type
  originalName: string; // Original filename
}

/**
 * File upload options
 */
export interface UploadOptions {
  folder?: string; // Folder/prefix for organization
  isPublic?: boolean; // Public or private access
  metadata?: Record<string, string>; // Additional metadata
  maxSizeBytes?: number; // Max file size
  allowedMimeTypes?: string[]; // Allowed file types
}

/**
 * Storage service interface
 * All storage providers must implement this
 */
export interface IStorageService {
  /**
   * Upload a file
   */
  upload(file: MulterFile, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Delete a file
   */
  delete(fileKey: string): Promise<void>;

  /**
   * Get public URL for a file
   */
  getUrl(fileKey: string): string;

  /**
   * Get signed URL (temporary access) for private files
   */
  getSignedUrl(fileKey: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Check if file exists
   */
  exists(fileKey: string): Promise<boolean>;

  /**
   * Get file as stream (for downloading)
   */
  getStream(fileKey: string): Promise<Readable>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
