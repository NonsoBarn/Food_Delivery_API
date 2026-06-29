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
var ProfileService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_profile_entity_1 = require("./entities/customer-profile.entity");
const vendor_profile_entity_1 = require("./entities/vendor-profile.entity");
const rider_profile_entity_1 = require("./entities/rider-profile.entity");
const user_entity_1 = require("./entities/user.entity");
const user_role_enum_1 = require("../common/enums/user-role.enum");
let ProfileService = ProfileService_1 = class ProfileService {
    customerProfileRepository;
    vendorProfileRepository;
    riderProfileRepository;
    userRepository;
    logger = new common_1.Logger(ProfileService_1.name);
    constructor(customerProfileRepository, vendorProfileRepository, riderProfileRepository, userRepository) {
        this.customerProfileRepository = customerProfileRepository;
        this.vendorProfileRepository = vendorProfileRepository;
        this.riderProfileRepository = riderProfileRepository;
        this.userRepository = userRepository;
    }
    async createCustomerProfile(userId, createDto) {
        const existing = await this.customerProfileRepository.findOne({
            where: { userId },
        });
        if (existing) {
            throw new common_1.BadRequestException('Customer profile already exists');
        }
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || user.role !== user_role_enum_1.UserRole.CUSTOMER) {
            throw new common_1.BadRequestException('User must have customer role');
        }
        const profile = this.customerProfileRepository.create({
            ...createDto,
            userId,
        });
        const savedProfile = await this.customerProfileRepository.save(profile);
        this.logger.log(`Customer profile created for user: ${userId}`);
        return savedProfile;
    }
    async getCustomerProfile(userId) {
        const profile = await this.customerProfileRepository.findOne({
            where: { userId },
            relations: ['user'],
        });
        if (!profile) {
            throw new common_1.NotFoundException('Customer profile not found');
        }
        return profile;
    }
    async updateCustomerProfile(userId, updateDto) {
        const profile = await this.getCustomerProfile(userId);
        Object.assign(profile, updateDto);
        const updatedProfile = await this.customerProfileRepository.save(profile);
        this.logger.log(`Customer profile updated for user: ${userId}`);
        return updatedProfile;
    }
    async createVendorProfile(userId, createDto) {
        const existing = await this.vendorProfileRepository.findOne({
            where: { userId },
        });
        if (existing) {
            throw new common_1.BadRequestException('Vendor profile already exists');
        }
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || user.role !== user_role_enum_1.UserRole.VENDOR) {
            throw new common_1.BadRequestException('User must have vendor role');
        }
        const profile = this.vendorProfileRepository.create({
            ...createDto,
            userId,
            status: vendor_profile_entity_1.VendorStatus.PENDING,
        });
        const savedProfile = await this.vendorProfileRepository.save(profile);
        this.logger.log(`Vendor profile created for user: ${userId}`);
        return savedProfile;
    }
    async getVendorProfile(userId) {
        const profile = await this.vendorProfileRepository.findOne({
            where: { userId },
            relations: ['user'],
        });
        if (!profile) {
            throw new common_1.NotFoundException('Vendor profile not found');
        }
        return profile;
    }
    async updateVendorProfile(userId, updateDto) {
        const profile = await this.getVendorProfile(userId);
        Object.assign(profile, updateDto);
        const updatedProfile = await this.vendorProfileRepository.save(profile);
        this.logger.log(`Vendor profile updated for user: ${userId}`);
        return updatedProfile;
    }
    async createRiderProfile(userId, createDto) {
        const existing = await this.riderProfileRepository.findOne({
            where: { userId },
        });
        if (existing) {
            throw new common_1.BadRequestException('Rider profile already exists');
        }
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || user.role !== user_role_enum_1.UserRole.RIDER) {
            throw new common_1.BadRequestException('User must have rider role');
        }
        const profile = this.riderProfileRepository.create({
            ...createDto,
            userId,
            status: rider_profile_entity_1.RiderStatus.PENDING,
        });
        const savedProfile = await this.riderProfileRepository.save(profile);
        this.logger.log(`Rider profile created for user: ${userId}`);
        return savedProfile;
    }
    async getRiderProfile(userId) {
        const profile = await this.riderProfileRepository.findOne({
            where: { userId },
            relations: ['user'],
        });
        if (!profile) {
            throw new common_1.NotFoundException('Rider profile not found');
        }
        return profile;
    }
    async updateRiderProfile(userId, updateDto) {
        const profile = await this.getRiderProfile(userId);
        Object.assign(profile, updateDto);
        const updatedProfile = await this.riderProfileRepository.save(profile);
        this.logger.log(`Rider profile updated for user: ${userId}`);
        return updatedProfile;
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = ProfileService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_profile_entity_1.CustomerProfile)),
    __param(1, (0, typeorm_1.InjectRepository)(vendor_profile_entity_1.VendorProfile)),
    __param(2, (0, typeorm_1.InjectRepository)(rider_profile_entity_1.RiderProfile)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ProfileService);
//# sourceMappingURL=profile.service.js.map