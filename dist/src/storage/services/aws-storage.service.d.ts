import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { IStorageService, UploadResult, UploadOptions } from '../interfaces/storage-service.interface';
import { MulterFile } from '../../common/types/multer.types';
export declare class AwsStorageService implements IStorageService {
    private readonly configService;
    private readonly logger;
    private readonly s3Client;
    private readonly bucket;
    private readonly publicUrl;
    constructor(configService: ConfigService);
    upload(file: MulterFile, options?: UploadOptions): Promise<UploadResult>;
    private validateFile;
    delete(fileKey: string): Promise<void>;
    getUrl(fileKey: string): string;
    getSignedUrl(fileKey: string, expiresInSeconds?: number): Promise<string>;
    exists(fileKey: string): Promise<boolean>;
    getStream(fileKey: string): Promise<Readable>;
    getProviderName(): string;
    private isNotFoundError;
    private convertToReadable;
}
