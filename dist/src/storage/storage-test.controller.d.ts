import { AwsStorageService } from './services/aws-storage.service';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
export declare class StorageTestController {
    private readonly awsStorageService;
    constructor(awsStorageService: AwsStorageService);
    testUpload(file: Express.Multer.File, user: RequestUser): Promise<{
        message: string;
        file: import("./interfaces/storage-service.interface").UploadResult;
    }>;
    testGetUrl(fileKey: string): {
        message: string;
        fileKey: string;
        url: string;
    };
    testGetSignedUrl(fileKey: string): Promise<{
        message: string;
        fileKey: string;
        signedUrl: string;
        expiresIn: string;
    }>;
    testExists(fileKey: string): Promise<{
        fileKey: string;
        exists: boolean;
        message: string;
    }>;
    testDelete(fileKey: string, user: RequestUser): Promise<{
        message: string;
        fileKey: string;
        deletedBy: string;
    }>;
    getInfo(): {
        provider: string;
        message: string;
    };
}
