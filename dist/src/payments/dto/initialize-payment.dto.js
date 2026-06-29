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
exports.InitializePaymentDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const payment_provider_enum_1 = require("../enums/payment-provider.enum");
class InitializePaymentDto {
    orderGroupId;
    provider;
    callbackUrl;
}
exports.InitializePaymentDto = InitializePaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Order group ID from checkout',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], InitializePaymentDto.prototype, "orderGroupId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment provider to use',
        enum: payment_provider_enum_1.PaymentProvider,
        example: payment_provider_enum_1.PaymentProvider.STRIPE,
    }),
    (0, class_validator_1.IsEnum)(payment_provider_enum_1.PaymentProvider, { message: 'Invalid payment provider' }),
    __metadata("design:type", String)
], InitializePaymentDto.prototype, "provider", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'URL to redirect after payment (for hosted checkout)',
        example: 'https://myapp.com/payment/callback',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], InitializePaymentDto.prototype, "callbackUrl", void 0);
//# sourceMappingURL=initialize-payment.dto.js.map