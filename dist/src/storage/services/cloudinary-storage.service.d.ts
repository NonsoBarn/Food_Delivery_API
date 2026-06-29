import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { IStorageService, UploadResult, UploadOptions } from '../interfaces/storage-service.interface';
export declare class CloudinaryStorageService implements IStorageService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    upload(file: Express.Multer.File, options?: UploadOptions): Promise<UploadResult>;
    delete(fileKey: string): Promise<void>;
    getUrl(fileKey: string): string;
    getSignedUrl(fileKey: string, expiresInSeconds?: number): Promise<string>;
    exists(fileKey: string): Promise<boolean>;
    getStream(fileKey: string): Promise<Readable>;
    getProviderName(): string;
    private uploadToCloudinary;
    private getResourceType;
    private isCloudinaryError;
}
