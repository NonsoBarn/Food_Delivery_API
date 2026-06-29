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
exports.CloudinaryTestController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const cloudinary_storage_service_1 = require("./services/cloudinary-storage.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const api_versions_1 = require("../common/constants/api-versions");
let CloudinaryTestController = class CloudinaryTestController {
    cloudinaryStorageService;
    constructor(cloudinaryStorageService) {
        this.cloudinaryStorageService = cloudinaryStorageService;
    }
    async testUpload(file, user) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new common_1.BadRequestException('File size exceeds 10MB limit');
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
        }
        console.log('📁 File received for Cloudinary:', {
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            user: user.email,
        });
        const result = await this.cloudinaryStorageService.upload(file, {
            folder: `food-delivery/test/${user.id}`,
            metadata: {
                uploadedBy: user.email,
                uploadedAt: new Date().toISOString(),
            },
        });
        return {
            message: 'File uploaded successfully to Cloudinary!',
            file: result,
            transformations: {
                original: result.url,
                thumbnail: result.url.replace('/upload/', '/upload/w_150,h_150,c_fill/'),
                medium: result.url.replace('/upload/', '/upload/w_500,h_500,c_limit/'),
                webp: result.url.replace('/upload/', '/upload/f_webp,q_auto/'),
            },
        };
    }
    testGetUrl(publicId) {
        const url = this.cloudinaryStorageService.getUrl(publicId);
        return {
            message: 'Cloudinary URLs with transformations',
            publicId,
            urls: {
                original: url,
                thumbnail: url.replace('/upload/', '/upload/w_150,h_150,c_fill/'),
                medium: url.replace('/upload/', '/upload/w_500,h_500/'),
                large: url.replace('/upload/', '/upload/w_1000,h_1000/'),
                webp: url.replace('/upload/', '/upload/f_webp,q_auto/'),
                circle: url.replace('/upload/', '/upload/w_200,h_200,c_fill,r_max/'),
            },
        };
    }
    async testExists(publicId) {
        const exists = await this.cloudinaryStorageService.exists(publicId);
        return {
            publicId,
            exists,
            message: exists
                ? 'File exists in Cloudinary'
                : 'File not found in Cloudinary',
        };
    }
    async testDelete(publicId, user) {
        const exists = await this.cloudinaryStorageService.exists(publicId);
        if (!exists) {
            throw new common_1.BadRequestException('File not found in Cloudinary');
        }
        await this.cloudinaryStorageService.delete(publicId);
        return {
            message: 'File deleted successfully from Cloudinary',
            publicId,
            deletedBy: user.email,
        };
    }
    getInfo() {
        return {
            provider: this.cloudinaryStorageService.getProviderName(),
            message: 'Cloudinary storage service is active',
            features: [
                'Automatic image optimization',
                'On-the-fly transformations',
                'Global CDN delivery',
                'Format conversion (JPG, PNG, WebP)',
                'Responsive images',
            ],
        };
    }
};
exports.CloudinaryTestController = CloudinaryTestController;
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
], CloudinaryTestController.prototype, "testUpload", null);
__decorate([
    (0, common_1.Get)('url/*publicId'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    __param(0, (0, common_1.Param)('publicId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CloudinaryTestController.prototype, "testGetUrl", null);
__decorate([
    (0, common_1.Get)('exists/*publicId'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    __param(0, (0, common_1.Param)('publicId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CloudinaryTestController.prototype, "testExists", null);
__decorate([
    (0, common_1.Delete)('*publicId'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    __param(0, (0, common_1.Param)('publicId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CloudinaryTestController.prototype, "testDelete", null);
__decorate([
    (0, common_1.Get)('info'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CloudinaryTestController.prototype, "getInfo", null);
exports.CloudinaryTestController = CloudinaryTestController = __decorate([
    (0, common_1.Controller)('cloudinary-test'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [cloudinary_storage_service_1.CloudinaryStorageService])
], CloudinaryTestController);
//# sourceMappingURL=cloudinary-test.controller.js.map