"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CloudinaryStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
let CloudinaryStorageService = CloudinaryStorageService_1 = class CloudinaryStorageService {
    configService;
    logger = new common_1.Logger(CloudinaryStorageService_1.name);
    constructor(configService) {
        this.configService = configService;
        const cloudName = this.configService.get('cloudinary.cloudName');
        const apiKey = this.configService.get('cloudinary.apiKey');
        const apiSecret = this.configService.get('cloudinary.apiSecret');
        const missingConfigs = [];
        if (!cloudName)
            missingConfigs.push('CLOUDINARY_CLOUD_NAME');
        if (!apiKey)
            missingConfigs.push('CLOUDINARY_API_KEY');
        if (!apiSecret)
            missingConfigs.push('CLOUDINARY_API_SECRET');
        if (missingConfigs.length > 0) {
            const errorMsg = `Cloudinary configuration is incomplete. Missing: ${missingConfigs.join(', ')} — service disabled`;
            this.logger.warn(errorMsg);
            return;
        }
        cloudinary_1.v2.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true,
        });
        this.logger.log(`✅ Cloudinary Storage initialized with cloud: ${cloudName}`);
    }
    async upload(file, options) {
        try {
            this.logger.log(`Starting Cloudinary upload: ${file.originalname}`);
            const folder = options?.folder || 'uploads';
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to upload file to Cloudinary: ${errorMessage}`, errorStack);
            throw error;
        }
    }
    async delete(fileKey) {
        try {
            this.logger.log(`Deleting file from Cloudinary: ${fileKey}`);
            const resourceType = this.getResourceType(fileKey);
            await cloudinary_1.v2.uploader.destroy(fileKey, {
                resource_type: resourceType,
            });
            this.logger.log(`✅ File deleted from Cloudinary: ${fileKey}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to delete file from Cloudinary: ${errorMessage}`, errorStack);
            throw error;
        }
    }
    getUrl(fileKey) {
        const cloudName = this.configService.get('cloudinary.cloudName');
        if (!cloudName) {
            throw new Error('Cloudinary cloud name not configured');
        }
        return `https://res.cloudinary.com/${cloudName}/image/upload/${fileKey}`;
    }
    getSignedUrl(fileKey, expiresInSeconds = 3600) {
        try {
            const cloudName = this.configService.get('cloudinary.cloudName');
            const apiSecret = this.configService.get('cloudinary.apiSecret');
            if (!cloudName || !apiSecret) {
                throw new Error('Cloudinary configuration not available');
            }
            const timestamp = Math.round(Date.now() / 1000) + expiresInSeconds;
            const signature = cloudinary_1.v2.utils.api_sign_request({
                public_id: fileKey,
                timestamp: timestamp,
            }, apiSecret);
            return Promise.resolve(`https://res.cloudinary.com/${cloudName}/image/upload/s--${signature}--/${fileKey}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to generate signed URL: ${errorMessage}`, errorStack);
            return Promise.reject(error);
        }
    }
    async exists(fileKey) {
        try {
            try {
                const result = await cloudinary_1.v2.api.resource(fileKey, {
                    resource_type: 'image',
                });
                return !!result;
            }
            catch (imageError) {
                try {
                    const result = await cloudinary_1.v2.api.resource(fileKey, {
                        resource_type: 'raw',
                    });
                    return !!result;
                }
                catch (rawError) {
                    if (imageError.error?.http_code === 404 ||
                        rawError.error?.http_code === 404) {
                        return false;
                    }
                    throw imageError;
                }
            }
        }
        catch (error) {
            this.logger.error(`Error checking if file exists: ${error.message}`, error.stack);
            if (error.error?.http_code === 404 || error.http_code === 404) {
                return false;
            }
            throw error;
        }
    }
    async getStream(fileKey) {
        try {
            const url = this.getUrl(fileKey);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch file from Cloudinary: ${response.statusText}`);
            }
            const webStream = response.body;
            if (!webStream) {
                throw new Error('No response body');
            }
            const reader = webStream.getReader();
            const stream = new stream_1.Readable({
                async read() {
                    const { done, value } = await reader.read();
                    if (done) {
                        this.push(null);
                    }
                    else {
                        this.push(Buffer.from(value));
                    }
                },
            });
            return stream;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to get file stream from Cloudinary: ${errorMessage}`, errorStack);
            throw error;
        }
    }
    getProviderName() {
        return 'cloudinary';
    }
    uploadToCloudinary(file, folder, options) {
        return new Promise((resolve, reject) => {
            const uploadOptions = {
                folder: folder,
                resource_type: 'auto',
                format: undefined,
            };
            if (options?.metadata) {
                uploadOptions.context = options.metadata;
            }
            const uploadStream = cloudinary_1.v2.uploader.upload_stream(uploadOptions, (error, result) => {
                if (error) {
                    const errorMessage = 'message' in error ? error.message : 'Upload failed';
                    this.logger.error(`Cloudinary upload error: ${errorMessage}`);
                    reject(error);
                }
                else if (result) {
                    resolve(result);
                }
                else {
                    reject(new Error('Upload failed with no result'));
                }
            });
            const bufferStream = new stream_1.Readable();
            bufferStream.push(file.buffer);
            bufferStream.push(null);
            bufferStream.pipe(uploadStream);
        });
    }
    getResourceType(fileKey) {
        const lowerKey = fileKey.toLowerCase();
        if (lowerKey.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/)) {
            return 'image';
        }
        else if (lowerKey.match(/\.(mp4|mov|avi|webm|mkv)$/)) {
            return 'video';
        }
        else {
            return 'raw';
        }
    }
    isCloudinaryError(error) {
        return (typeof error === 'object' &&
            error !== null &&
            'http_code' in error &&
            typeof error.http_code === 'number');
    }
};
exports.CloudinaryStorageService = CloudinaryStorageService;
exports.CloudinaryStorageService = CloudinaryStorageService = CloudinaryStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudinaryStorageService);
//# sourceMappingURL=cloudinary-storage.service.js.map