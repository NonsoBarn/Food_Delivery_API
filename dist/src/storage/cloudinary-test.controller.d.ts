import { CloudinaryStorageService } from './services/cloudinary-storage.service';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
export declare class CloudinaryTestController {
    private readonly cloudinaryStorageService;
    constructor(cloudinaryStorageService: CloudinaryStorageService);
    testUpload(file: Express.Multer.File, user: RequestUser): Promise<{
        message: string;
        file: import("./interfaces/storage-service.interface").UploadResult;
        transformations: {
            original: string;
            thumbnail: string;
            medium: string;
            webp: string;
        };
    }>;
    testGetUrl(publicId: string): {
        message: string;
        publicId: string;
        urls: {
            original: string;
            thumbnail: string;
            medium: string;
            large: string;
            webp: string;
            circle: string;
        };
    };
    testExists(publicId: string): Promise<{
        publicId: string;
        exists: boolean;
        message: string;
    }>;
    testDelete(publicId: string, user: RequestUser): Promise<{
        message: string;
        publicId: string;
        deletedBy: string;
    }>;
    getInfo(): {
        provider: string;
        message: string;
        features: string[];
    };
}
