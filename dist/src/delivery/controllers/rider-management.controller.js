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
exports.RiderManagementController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rider_management_service_1 = require("../services/rider-management.service");
const rider_location_service_1 = require("../services/rider-location.service");
const reject_rider_dto_1 = require("../dto/reject-rider.dto");
const update_availability_dto_1 = require("../dto/update-availability.dto");
const update_location_dto_1 = require("../dto/update-location.dto");
const find_nearby_riders_dto_1 = require("../dto/find-nearby-riders.dto");
const rider_filter_dto_1 = require("../dto/rider-filter.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const user_role_enum_1 = require("../../common/enums/user-role.enum");
const user_entity_1 = require("../../users/entities/user.entity");
let RiderManagementController = class RiderManagementController {
    riderManagementService;
    riderLocationService;
    constructor(riderManagementService, riderLocationService) {
        this.riderManagementService = riderManagementService;
        this.riderLocationService = riderLocationService;
    }
    async getAllRiders(filters) {
        return this.riderManagementService.findAllRiders(filters);
    }
    async getAvailableRiders() {
        return this.riderManagementService.findAvailableRiders();
    }
    async toggleAvailability(dto, user) {
        const reqUser = user;
        if (!reqUser.riderProfile?.id) {
            return {
                message: 'You do not have a rider profile. Create one first.',
            };
        }
        return this.riderManagementService.toggleAvailability(reqUser.riderProfile.id, dto.availabilityStatus);
    }
    async updateLocation(dto, user) {
        const reqUser = user;
        if (!reqUser.riderProfile?.id) {
            return { message: 'You do not have a rider profile.' };
        }
        await this.riderLocationService.updateLocation(reqUser.riderProfile.id, dto.latitude, dto.longitude, dto.heading, dto.speed);
        return { message: 'Location updated' };
    }
    async findNearbyRiders(dto) {
        return this.riderLocationService.findNearestRiders(dto.latitude, dto.longitude, dto.radiusKm, dto.limit);
    }
    async getMyDeliveries(user, page, limit) {
        const reqUser = user;
        if (!reqUser.riderProfile?.id) {
            return { deliveries: [], total: 0 };
        }
        return this.riderManagementService.findRiderDeliveries(reqUser.riderProfile.id, page, limit);
    }
    async approveRider(riderId, user) {
        return this.riderManagementService.approveRider(riderId, user.id);
    }
    async rejectRider(riderId, dto) {
        return this.riderManagementService.rejectRider(riderId, dto.rejectionReason);
    }
    async suspendRider(riderId) {
        return this.riderManagementService.suspendRider(riderId);
    }
};
exports.RiderManagementController = RiderManagementController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List all riders with filters', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated rider list' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [rider_filter_dto_1.RiderFilterDto]),
    __metadata("design:returntype", Promise)
], RiderManagementController.prototype, "getAllRiders", null);
__decorate([
    (0, common_1.Get)('available'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get available (approved + online) riders', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Available riders' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RiderManagementController.prototype, "getAvailableRiders", null);
__decorate([
    (0, common_1.Patch)('availability'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.RIDER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle rider availability (online/offline)', description: 'Roles: rider' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Availability updated' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_availability_dto_1.UpdateAvailabilityDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], RiderManagementController.prototype, "toggleAvailability", null);
__decorate([
    (0, common_1.Put)('location'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.RIDER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update rider GPS location', description: 'Roles: rider. Call every 5–10 seconds while on duty.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '{ message: "Location updated" }' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_location_dto_1.UpdateLocationDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], RiderManagementController.prototype, "updateLocation", null);
__decorate([
    (0, common_1.Get)('nearby'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Find nearest riders to a location', description: 'Roles: admin. Uses Redis GEOSEARCH.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Nearest riders with distances' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [find_nearby_riders_dto_1.FindNearbyRidersDto]),
    __metadata("design:returntype", Promise)
], RiderManagementController.prototype, "findNearbyRiders", null);
__decorate([
    (0, common_1.Get)('my-deliveries'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.RIDER),
    (0, swagger_1.ApiOperation)({ summary: "Get rider's own delivery history", description: 'Roles: rider' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated delivery history' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, Number]),
    __metadata("design:returntype", Promise)
], RiderManagementController.prototype, "getMyDeliveries", null);
__decorate([
    (0, common_1.Patch)(':riderId/approve'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a rider application', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Rider approved' }),
    __param(0, (0, common_1.Param)('riderId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], RiderManagementController.prototype, "approveRider", null);
__decorate([
    (0, common_1.Patch)(':riderId/reject'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a rider application', description: 'Roles: admin. Rejection reason required.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Rider rejected' }),
    __param(0, (0, common_1.Param)('riderId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reject_rider_dto_1.RejectRiderDto]),
    __metadata("design:returntype", Promise)
], RiderManagementController.prototype, "rejectRider", null);
__decorate([
    (0, common_1.Patch)(':riderId/suspend'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Suspend a rider', description: 'Roles: admin. Immediately takes rider offline.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Rider suspended' }),
    __param(0, (0, common_1.Param)('riderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RiderManagementController.prototype, "suspendRider", null);
exports.RiderManagementController = RiderManagementController = __decorate([
    (0, swagger_1.ApiTags)('Riders'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({
        path: 'riders',
        version: '1',
    }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [rider_management_service_1.RiderManagementService,
        rider_location_service_1.RiderLocationService])
], RiderManagementController);
//# sourceMappingURL=rider-management.controller.js.map