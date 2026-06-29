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
exports.ProfileController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const profile_service_1 = require("./profile.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_customer_profile_dto_1 = require("./dto/create-customer-profile.dto");
const update_customer_profile_dto_1 = require("./dto/update-customer-profile.dto");
const create_vendor_profile_dto_1 = require("./dto/create-vendor-profile.dto");
const update_vendor_profile_dto_1 = require("./dto/update-vendor-profile.dto");
const create_rider_profile_dto_1 = require("./dto/create-rider-profile.dto");
const update_rider_profile_dto_1 = require("./dto/update-rider-profile.dto");
const api_versions_1 = require("../common/constants/api-versions");
let ProfileController = class ProfileController {
    profileService;
    constructor(profileService) {
        this.profileService = profileService;
    }
    async createCustomerProfile(user, createDto) {
        return this.profileService.createCustomerProfile(user.id, createDto);
    }
    async getCustomerProfile(user) {
        return this.profileService.getCustomerProfile(user.id);
    }
    async updateCustomerProfile(user, updateDto) {
        return this.profileService.updateCustomerProfile(user.id, updateDto);
    }
    async createVendorProfile(user, createDto) {
        return this.profileService.createVendorProfile(user.id, createDto);
    }
    async getVendorProfile(user) {
        return this.profileService.getVendorProfile(user.id);
    }
    async updateVendorProfile(user, updateDto) {
        return this.profileService.updateVendorProfile(user.id, updateDto);
    }
    async createRiderProfile(user, createDto) {
        return this.profileService.createRiderProfile(user.id, createDto);
    }
    async getRiderProfile(user) {
        return this.profileService.getRiderProfile(user.id);
    }
    async updateRiderProfile(user, updateDto) {
        return this.profileService.updateRiderProfile(user.id, updateDto);
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Post)('customer'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create customer profile' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Customer profile created' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_customer_profile_dto_1.CreateCustomerProfileDto]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "createCustomerProfile", null);
__decorate([
    (0, common_1.Get)('customer'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, swagger_1.ApiOperation)({ summary: 'Get customer profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Customer profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getCustomerProfile", null);
__decorate([
    (0, common_1.Put)('customer'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, swagger_1.ApiOperation)({ summary: 'Update customer profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated customer profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_customer_profile_dto_1.UpdateCustomerProfileDto]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "updateCustomerProfile", null);
__decorate([
    (0, common_1.Post)('vendor'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create vendor profile' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Vendor profile created' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_vendor_profile_dto_1.CreateVendorProfileDto]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "createVendorProfile", null);
__decorate([
    (0, common_1.Get)('vendor'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, swagger_1.ApiOperation)({ summary: 'Get vendor profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Vendor profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getVendorProfile", null);
__decorate([
    (0, common_1.Put)('vendor'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, swagger_1.ApiOperation)({ summary: 'Update vendor profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated vendor profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_vendor_profile_dto_1.UpdateVendorProfileDto]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "updateVendorProfile", null);
__decorate([
    (0, common_1.Post)('rider'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create rider profile' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Rider profile created' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_rider_profile_dto_1.CreateRiderProfileDto]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "createRiderProfile", null);
__decorate([
    (0, common_1.Get)('rider'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, swagger_1.ApiOperation)({ summary: 'Get rider profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Rider profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getRiderProfile", null);
__decorate([
    (0, common_1.Put)('rider'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, swagger_1.ApiOperation)({ summary: 'Update rider profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated rider profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_rider_profile_dto_1.UpdateRiderProfileDto]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "updateRiderProfile", null);
exports.ProfileController = ProfileController = __decorate([
    (0, swagger_1.ApiTags)('Profile'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [profile_service_1.ProfileService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map