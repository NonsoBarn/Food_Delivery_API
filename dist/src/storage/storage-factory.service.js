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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageFactoryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const aws_storage_service_1 = require("./services/aws-storage.service");
const cloudinary_storage_service_1 = require("./services/cloudinary-storage.service");
let StorageFactoryService = class StorageFactoryService {
    configService;
    awsStorageService;
    cloudinaryStorageService;
    constructor(configService, awsStorageService, cloudinaryStorageService) {
        this.configService = configService;
        this.awsStorageService = awsStorageService;
        this.cloudinaryStorageService = cloudinaryStorageService;
    }
    getStorageService(category = 'default') {
        switch (category) {
            case 'image':
                return this.cloudinaryStorageService;
            case 'video':
                return this.cloudinaryStorageService;
            case 'document':
                return this.awsStorageService;
            case 'default':
            default:
                return this.getDefaultService();
        }
    }
    getServiceByProvider(provider) {
        switch (provider.toLowerCase()) {
            case 'cloudinary':
                return this.cloudinaryStorageService;
            case 'aws':
            case 's3':
            case 'aws-s3':
                return this.awsStorageService;
            default:
                return this.getDefaultService();
        }
    }
    getDefaultService() {
        const provider = this.configService.get('storage.provider', 'cloudinary');
        switch (provider.toLowerCase()) {
            case 'cloudinary':
                return this.cloudinaryStorageService;
            case 'aws':
            case 's3':
                return this.awsStorageService;
            default:
                return this.cloudinaryStorageService;
        }
    }
    getAllServices() {
        return {
            cloudinary: this.cloudinaryStorageService,
            aws: this.awsStorageService,
        };
    }
};
exports.StorageFactoryService = StorageFactoryService;
exports.StorageFactoryService = StorageFactoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        aws_storage_service_1.AwsStorageService,
        cloudinary_storage_service_1.CloudinaryStorageService])
], StorageFactoryService);
//# sourceMappingURL=storage-factory.service.js.map