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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const payments_service_1 = require("./payments.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const user_entity_1 = require("../users/entities/user.entity");
const initialize_payment_dto_1 = require("./dto/initialize-payment.dto");
const verify_payment_dto_1 = require("./dto/verify-payment.dto");
const refund_payment_dto_1 = require("./dto/refund-payment.dto");
const update_provider_config_dto_1 = require("./dto/update-provider-config.dto");
const payment_provider_enum_1 = require("./enums/payment-provider.enum");
let PaymentsController = class PaymentsController {
    paymentsService;
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async getEnabledProviders() {
        return this.paymentsService.getEnabledProviders();
    }
    async initializePayment(dto, user) {
        if (!user.customerProfile?.id) {
            throw new common_1.BadRequestException('Customer profile is required to make a payment');
        }
        return this.paymentsService.initializePayment(dto.orderGroupId, user.customerProfile.id, user.email, dto.provider, dto.callbackUrl);
    }
    async verifyPayment(dto) {
        return this.paymentsService.verifyPayment(dto.reference);
    }
    async getPaymentsByOrderGroup(orderGroupId) {
        return this.paymentsService.findByOrderGroup(orderGroupId);
    }
    async getPayment(id) {
        return this.paymentsService.findOne(id);
    }
    async refundPayment(dto) {
        return this.paymentsService.refundPayment(dto.paymentId, dto.amount, dto.reason);
    }
    async getProviderConfigs() {
        return this.paymentsService.getAllProviderConfigs();
    }
    async updateProviderConfig(provider, dto) {
        return this.paymentsService.updateProviderConfig(provider, dto);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Get)('providers'),
    (0, swagger_1.ApiOperation)({ summary: 'Get enabled payment providers (public)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of enabled providers for checkout UI' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getEnabledProviders", null);
__decorate([
    (0, common_1.Post)('initialize'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.CUSTOMER),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Initialize a payment', description: 'Roles: customer. Returns checkoutUrl (Paystack/Flutterwave) or clientSecret (Stripe).' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Payment initialized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden — not a customer' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [initialize_payment_dto_1.InitializePaymentDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "initializePayment", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.CUSTOMER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Verify a payment after redirect', description: 'Roles: customer' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment verified and orders updated' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_payment_dto_1.VerifyPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "verifyPayment", null);
__decorate([
    (0, common_1.Get)('order-group/:orderGroupId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get payments for an order group' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payments for the order group' }),
    __param(0, (0, common_1.Param)('orderGroupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPaymentsByOrderGroup", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get payment by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment detail' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPayment", null);
__decorate([
    (0, common_1.Post)('refund'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Refund a payment', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Refund processed' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refund_payment_dto_1.RefundPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "refundPayment", null);
__decorate([
    (0, common_1.Get)('providers/config'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all provider configs', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provider configurations' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getProviderConfigs", null);
__decorate([
    (0, common_1.Patch)('providers/:provider/config'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update provider config (enable/disable, fees, currencies)', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provider config updated' }),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_provider_config_dto_1.UpdateProviderConfigDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "updateProviderConfig", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, common_1.Controller)({
        path: 'payments',
        version: '1',
    }),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map