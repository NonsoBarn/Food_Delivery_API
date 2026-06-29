import { Readable } from 'stream';
import { MulterFile } from '../../common/types/multer.types';
export interface UploadResult {
    key: string;
    url: string;
    provider: string;
    size: number;
    mimeType: string;
    originalName: string;
}
export interface UploadOptions {
    folder?: string;
    isPublic?: boolean;
    metadata?: Record<string, string>;
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
}
export interface IStorageService {
    upload(file: MulterFile, options?: UploadOptions): Promise<UploadResult>;
    delete(fileKey: string): Promise<void>;
    getUrl(fileKey: string): string;
    getSignedUrl(fileKey: string, expiresInSeconds?: number): Promise<string>;
    exists(fileKey: string): Promise<boolean>;
    getStream(fileKey: string): Promise<Readable>;
    getProviderName(): string;
}
