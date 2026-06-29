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
var RiderManagementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiderManagementService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const rider_profile_entity_1 = require("../../users/entities/rider-profile.entity");
const delivery_entity_1 = require("../entities/delivery.entity");
let RiderManagementService = RiderManagementService_1 = class RiderManagementService {
    riderRepository;
    deliveryRepository;
    logger = new common_1.Logger(RiderManagementService_1.name);
    constructor(riderRepository, deliveryRepository) {
        this.riderRepository = riderRepository;
        this.deliveryRepository = deliveryRepository;
    }
    async approveRider(riderId, adminUserId) {
        const rider = await this.findRiderOrFail(riderId);
        if (rider.status !== rider_profile_entity_1.RiderStatus.PENDING) {
            throw new common_1.BadRequestException(`Cannot approve a rider with status "${rider.status}". Only pending riders can be approved.`);
        }
        rider.status = rider_profile_entity_1.RiderStatus.APPROVED;
        rider.approvedAt = new Date();
        rider.approvedBy = adminUserId;
        const saved = await this.riderRepository.save(rider);
        this.logger.log(`Rider ${riderId} approved by admin ${adminUserId}`);
        return saved;
    }
    async rejectRider(riderId, rejectionReason) {
        const rider = await this.findRiderOrFail(riderId);
        if (rider.status !== rider_profile_entity_1.RiderStatus.PENDING) {
            throw new common_1.BadRequestException(`Cannot reject a rider with status "${rider.status}". Only pending riders can be rejected.`);
        }
        rider.status = rider_profile_entity_1.RiderStatus.REJECTED;
        rider.rejectionReason = rejectionReason;
        const saved = await this.riderRepository.save(rider);
        this.logger.log(`Rider ${riderId} rejected. Reason: ${rejectionReason}`);
        return saved;
    }
    async suspendRider(riderId) {
        const rider = await this.findRiderOrFail(riderId);
        if (rider.status === rider_profile_entity_1.RiderStatus.SUSPENDED) {
            throw new common_1.BadRequestException('Rider is already suspended');
        }
        rider.status = rider_profile_entity_1.RiderStatus.SUSPENDED;
        rider.availabilityStatus = rider_profile_entity_1.AvailabilityStatus.OFFLINE;
        const saved = await this.riderRepository.save(rider);
        this.logger.log(`Rider ${riderId} suspended`);
        return saved;
    }
    async findAllRiders(filters) {
        const { status, availabilityStatus, page = 1, limit = 20 } = filters;
        const queryBuilder = this.riderRepository
            .createQueryBuilder('rider')
            .leftJoinAndSelect('rider.user', 'user');
        if (status) {
            queryBuilder.andWhere('rider.status = :status', { status });
        }
        if (availabilityStatus) {
            queryBuilder.andWhere('rider.availabilityStatus = :availabilityStatus', {
                availabilityStatus,
            });
        }
        queryBuilder
            .orderBy('rider.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        const [riders, total] = await queryBuilder.getManyAndCount();
        return { riders, total };
    }
    async findAvailableRiders() {
        return this.riderRepository.find({
            where: {
                status: rider_profile_entity_1.RiderStatus.APPROVED,
                availabilityStatus: rider_profile_entity_1.AvailabilityStatus.ONLINE,
            },
            order: { rating: 'DESC' },
        });
    }
    async toggleAvailability(riderProfileId, availabilityStatus) {
        const rider = await this.findRiderOrFail(riderProfileId);
        if (availabilityStatus === rider_profile_entity_1.AvailabilityStatus.ONLINE &&
            rider.status !== rider_profile_entity_1.RiderStatus.APPROVED) {
            throw new common_1.BadRequestException(`Cannot go online. Your rider application status is "${rider.status}". Only approved riders can go online.`);
        }
        rider.availabilityStatus = availabilityStatus;
        const saved = await this.riderRepository.save(rider);
        this.logger.log(`Rider ${riderProfileId} is now ${availabilityStatus}`);
        return saved;
    }
    async findRiderDeliveries(riderId, page = 1, limit = 20) {
        const [deliveries, total] = await this.deliveryRepository.findAndCount({
            where: { riderId },
            relations: ['order'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { deliveries, total };
    }
    async findRiderOrFail(riderId) {
        const rider = await this.riderRepository.findOne({
            where: { id: riderId },
        });
        if (!rider) {
            throw new common_1.NotFoundException(`Rider with ID "${riderId}" not found`);
        }
        return rider;
    }
};
exports.RiderManagementService = RiderManagementService;
exports.RiderManagementService = RiderManagementService = RiderManagementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(rider_profile_entity_1.RiderProfile)),
    __param(1, (0, typeorm_1.InjectRepository)(delivery_entity_1.Delivery)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], RiderManagementService);
//# sourceMappingURL=rider-management.service.js.map