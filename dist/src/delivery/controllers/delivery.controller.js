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
exports.DeliveryController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const delivery_service_1 = require("../services/delivery.service");
const rider_location_service_1 = require("../services/rider-location.service");
const assign_delivery_dto_1 = require("../dto/assign-delivery.dto");
const auto_assign_dto_1 = require("../dto/auto-assign.dto");
const complete_delivery_dto_1 = require("../dto/complete-delivery.dto");
const cancel_delivery_dto_1 = require("../dto/cancel-delivery.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const user_role_enum_1 = require("../../common/enums/user-role.enum");
const user_entity_1 = require("../../users/entities/user.entity");
const assignment_type_enum_1 = require("../enums/assignment-type.enum");
let DeliveryController = class DeliveryController {
    deliveryService;
    riderLocationService;
    constructor(deliveryService, riderLocationService) {
        this.deliveryService = deliveryService;
        this.riderLocationService = riderLocationService;
    }
    async assignDelivery(dto, user) {
        return this.deliveryService.assignOrderToRider(dto.orderId, dto.riderId, user.id, assignment_type_enum_1.AssignmentType.MANUAL);
    }
    async autoAssignDelivery(dto) {
        const result = await this.deliveryService.autoAssignOrder(dto.orderId);
        if (!result) {
            return {
                message: 'No available riders found nearby. Please try again later or assign manually.',
                assigned: false,
            };
        }
        return { delivery: result, assigned: true };
    }
    async getActiveDelivery(user) {
        const reqUser = user;
        if (!reqUser.riderProfile?.id) {
            return null;
        }
        return this.deliveryService.findActiveDeliveryForRider(reqUser.riderProfile.id);
    }
    async getDeliveryByOrder(orderId) {
        return this.deliveryService.findDeliveryByOrder(orderId);
    }
    async trackDelivery(orderId) {
        return this.riderLocationService.getDeliveryLocation(orderId);
    }
    async acceptDelivery(id, user) {
        const reqUser = user;
        return this.deliveryService.acceptDelivery(id, reqUser.riderProfile.id);
    }
    async rejectDelivery(id, user) {
        const reqUser = user;
        return this.deliveryService.rejectDelivery(id, reqUser.riderProfile.id);
    }
    async pickUpDelivery(id, user) {
        const reqUser = user;
        return this.deliveryService.pickUpDelivery(id, reqUser.riderProfile.id);
    }
    async completeDelivery(id, dto, proofImage, user) {
        const reqUser = user;
        return this.deliveryService.completeDelivery(id, reqUser.riderProfile.id, proofImage, dto.deliveryNotes);
    }
    async cancelDelivery(id, dto, user) {
        return this.deliveryService.cancelDelivery(id, user.id, dto.cancellationReason);
    }
    async getDelivery(id) {
        return this.deliveryService.getDeliveryDetails(id);
    }
};
exports.DeliveryController = DeliveryController;
__decorate([
    (0, common_1.Post)('assign'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Manually assign an order to a rider', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Delivery assigned' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assign_delivery_dto_1.AssignDeliveryDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "assignDelivery", null);
__decorate([
    (0, common_1.Post)('auto-assign'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Auto-assign order to nearest available rider', description: 'Roles: admin. Uses Redis GEOSEARCH.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '{ delivery, assigned } or { message, assigned: false }' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auto_assign_dto_1.AutoAssignDto]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "autoAssignDelivery", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.RIDER),
    (0, swagger_1.ApiOperation)({ summary: "Get rider's current active delivery", description: 'Roles: rider' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Active delivery or null' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "getActiveDelivery", null);
__decorate([
    (0, common_1.Get)('order/:orderId'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.CUSTOMER, user_role_enum_1.UserRole.RIDER, user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get delivery info for an order', description: 'Roles: customer, rider, admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Delivery detail' }),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "getDeliveryByOrder", null);
__decorate([
    (0, common_1.Get)('order/:orderId/track'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.CUSTOMER, user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Track rider real-time location for a delivery', description: 'Roles: customer, admin. Poll every few seconds.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Rider location or null' }),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "trackDelivery", null);
__decorate([
    (0, common_1.Patch)(':id/accept'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.RIDER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Accept a delivery assignment', description: 'Roles: rider' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Delivery accepted' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "acceptDelivery", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.RIDER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a delivery assignment', description: 'Roles: rider. Order goes back to pool.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Delivery rejected' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "rejectDelivery", null);
__decorate([
    (0, common_1.Patch)(':id/pickup'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.RIDER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Mark food as picked up from vendor', description: 'Roles: rider' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Delivery and order status updated to PICKED_UP' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "pickUpDelivery", null);
__decorate([
    (0, common_1.Patch)(':id/complete'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.RIDER),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('proofImage')),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Complete a delivery with optional proof image', description: 'Roles: rider. multipart/form-data: proofImage (file) + deliveryNotes (string).' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Delivery completed' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, complete_delivery_dto_1.CompleteDeliveryDto, Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "completeDelivery", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a delivery', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Delivery cancelled' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cancel_delivery_dto_1.CancelDeliveryDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "cancelDelivery", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.RIDER, user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get delivery details by ID', description: 'Roles: rider, admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Delivery detail' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "getDelivery", null);
exports.DeliveryController = DeliveryController = __decorate([
    (0, swagger_1.ApiTags)('Delivery'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({
        path: 'deliveries',
        version: '1',
    }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [delivery_service_1.DeliveryService,
        rider_location_service_1.RiderLocationService])
], DeliveryController);
//# sourceMappingURL=delivery.controller.js.map