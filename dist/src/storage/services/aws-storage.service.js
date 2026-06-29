"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AwsStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const stream_1 = require("stream");
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
let AwsStorageService = AwsStorageService_1 = class AwsStorageService {
    configService;
    logger = new common_1.Logger(AwsStorageService_1.name);
    s3Client;
    bucket;
    publicUrl;
    constructor(configService) {
        this.configService = configService;
        const region = this.configService.get('aws.region');
        const accessKeyId = this.configService.get('aws.accessKeyId');
        const secretAccessKey = this.configService.get('aws.secretAccessKey');
        const bucket = this.configService.get('aws.s3.bucket');
        const publicUrl = this.configService.get('aws.s3.publicUrl');
        if (!region || !bucket || !publicUrl) {
            throw new Error('AWS S3 configuration is incomplete');
        }
        const clientConfig = { region };
        if (accessKeyId && secretAccessKey) {
            clientConfig.credentials = { accessKeyId, secretAccessKey };
        }
        this.s3Client = new client_s3_1.S3Client(clientConfig);
        this.bucket = bucket;
        this.publicUrl = publicUrl;
        this.logger.log(`AWS S3 Storage initialized with bucket: ${this.bucket}`);
    }
    async upload(file, options) {
        try {
            this.validateFile(file);
            const fileExtension = path.extname(file.originalname);
            const fileName = `${(0, uuid_1.v4)()}${fileExtension}`;
            const folder = options?.folder || 'uploads';
            const key = `${folder}/${fileName}`;
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                Metadata: options?.metadata || {},
            });
            await this.s3Client.send(command);
            this.logger.log(`File uploaded to S3: ${key}`);
            const url = `${this.publicUrl}/${key}`;
            return {
                key,
                url,
                provider: 'aws-s3',
                size: file.size,
                mimeType: file.mimetype,
                originalName: file.originalname,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to upload file to S3: ${errorMessage}`, errorStack);
            throw error;
        }
    }
    validateFile(file) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        if (!file.originalname) {
            throw new common_1.BadRequestException('File must have a name');
        }
        if (!file.buffer || file.buffer.length === 0) {
            throw new common_1.BadRequestException('File is empty');
        }
        if (!file.mimetype) {
            throw new common_1.BadRequestException('File must have a MIME type');
        }
        if (file.size <= 0) {
            throw new common_1.BadRequestException('File size must be greater than 0');
        }
    }
    async delete(fileKey) {
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: fileKey,
            });
            await this.s3Client.send(command);
            this.logger.log(`File deleted from S3: ${fileKey}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to delete file from S3: ${errorMessage}`, errorStack);
            throw error;
        }
    }
    getUrl(fileKey) {
        return `${this.publicUrl}/${fileKey}`;
    }
    async getSignedUrl(fileKey, expiresInSeconds = 3600) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: fileKey,
            });
            const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, {
                expiresIn: expiresInSeconds,
            });
            return signedUrl;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to generate signed URL: ${errorMessage}`, errorStack);
            throw error;
        }
    }
    async exists(fileKey) {
        try {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: fileKey,
            });
            await this.s3Client.send(command);
            return true;
        }
        catch (error) {
            if (this.isNotFoundError(error)) {
                return false;
            }
            throw error;
        }
    }
    async getStream(fileKey) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: fileKey,
            });
            const response = await this.s3Client.send(command);
            if (!response.Body) {
                throw new Error('No body in S3 response');
            }
            if (response.Body instanceof stream_1.Readable) {
                return response.Body;
            }
            return this.convertToReadable(response.Body);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to get file stream from S3: ${errorMessage}`, errorStack);
            throw error;
        }
    }
    getProviderName() {
        return 'aws-s3';
    }
    isNotFoundError(error) {
        return (typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            error.name === 'NotFound');
    }
    convertToReadable(body) {
        if (body instanceof stream_1.Readable) {
            return body;
        }
        if (typeof body === 'object' &&
            body !== null &&
            'transformToWebStream' in body &&
            typeof body
                .transformToWebStream === 'function') {
            throw new Error('WebStream conversion not yet implemented. Please use Node.js environment.');
        }
        if (typeof body === 'object' &&
            body !== null &&
            'pipe' in body &&
            typeof body.pipe === 'function') {
            return body;
        }
        throw new Error('Unable to convert Body to Readable stream');
    }
};
exports.AwsStorageService = AwsStorageService;
exports.AwsStorageService = AwsStorageService = AwsStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AwsStorageService);
//# sourceMappingURL=aws-storage.service.js.map