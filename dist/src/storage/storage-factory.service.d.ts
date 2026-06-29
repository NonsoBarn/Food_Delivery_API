import { ConfigService } from '@nestjs/config';
import { AwsStorageService } from './services/aws-storage.service';
import { CloudinaryStorageService } from './services/cloudinary-storage.service';
import { IStorageService } from './interfaces/storage-service.interface';
export type FileCategory = 'image' | 'document' | 'video' | 'default';
export declare class StorageFactoryService {
    private readonly configService;
    private readonly awsStorageService;
    private readonly cloudinaryStorageService;
    constructor(configService: ConfigService, awsStorageService: AwsStorageService, cloudinaryStorageService: CloudinaryStorageService);
    getStorageService(category?: FileCategory): IStorageService;
    getServiceByProvider(provider: string): IStorageService;
    private getDefaultService;
    getAllServices(): Record<string, IStorageService>;
}
