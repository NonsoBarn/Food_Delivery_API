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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageTestController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const aws_storage_service_1 = require("./services/aws-storage.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const api_versions_1 = require("../common/constants/api-versions");
let StorageTestController = class StorageTestController {
    awsStorageService;
    constructor(awsStorageService) {
        this.awsStorageService = awsStorageService;
    }
    async testUpload(file, user) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new common_1.BadRequestException('File size exceeds 5MB limit');
        }
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
        ];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
        }
        const result = await this.awsStorageService.upload(file, {
            folder: `test-uploads/${user.id}`,
            isPublic: true,
            metadata: {
                uploadedBy: user.email,
                uploadedAt: new Date().toISOString(),
            },
        });
        return {
            message: 'File uploaded successfully!',
            file: result,
        };
    }
    testGetUrl(fileKey) {
        const url = this.awsStorageService.getUrl(fileKey);
        return {
            message: 'Public URL generated',
            fileKey,
            url,
        };
    }
    async testGetSignedUrl(fileKey) {
        const exists = await this.awsStorageService.exists(fileKey);
        if (!exists) {
            throw new common_1.BadRequestException('File not found in S3');
        }
        const signedUrl = await this.awsStorageService.getSignedUrl(fileKey, 3600);
        return {
            message: 'Signed URL generated (valid for 1 hour)',
            fileKey,
            signedUrl,
            expiresIn: '1 hour',
        };
    }
    async testExists(fileKey) {
        const exists = await this.awsStorageService.exists(fileKey);
        return {
            fileKey,
            exists,
            message: exists ? 'File exists in S3' : 'File not found in S3',
        };
    }
    async testDelete(fileKey, user) {
        const exists = await this.awsStorageService.exists(fileKey);
        if (!exists) {
            throw new common_1.BadRequestException('File not found in S3');
        }
        await this.awsStorageService.delete(fileKey);
        return {
            message: 'File deleted successfully',
            fileKey,
            deletedBy: user.email,
        };
    }
    getInfo() {
        return {
            provider: this.awsStorageService.getProviderName(),
            message: 'AWS S3 storage service is active',
        };
    }
};
exports.StorageTestController = StorageTestController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StorageTestController.prototype, "testUpload", null);
__decorate([
    (0, common_1.Get)('url/*fileKey'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    __param(0, (0, common_1.Param)('fileKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StorageTestController.prototype, "testGetUrl", null);
__decorate([
    (0, common_1.Get)('signed-url/*fileKey'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    __param(0, (0, common_1.Param)('fileKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorageTestController.prototype, "testGetSignedUrl", null);
__decorate([
    (0, common_1.Get)('exists/*fileKey'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    __param(0, (0, common_1.Param)('fileKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorageTestController.prototype, "testExists", null);
__decorate([
    (0, common_1.Delete)('*fileKey'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    __param(0, (0, common_1.Param)('fileKey')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageTestController.prototype, "testDelete", null);
__decorate([
    (0, common_1.Get)('info'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StorageTestController.prototype, "getInfo", null);
exports.StorageTestController = StorageTestController = __decorate([
    (0, common_1.Controller)('storage-test'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [aws_storage_service_1.AwsStorageService])
], StorageTestController);
//# sourceMappingURL=storage-test.controller.js.map