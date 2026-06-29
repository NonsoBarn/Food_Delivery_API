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
exports.CreateOrderDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const payment_method_enum_1 = require("../enums/payment-method.enum");
class CreateOrderDto {
    paymentMethod;
    deliveryAddress;
    customerNotes;
}
exports.CreateOrderDto = CreateOrderDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment method for the order',
        enum: payment_method_enum_1.PaymentMethod,
        example: payment_method_enum_1.PaymentMethod.CASH_ON_DELIVERY,
    }),
    (0, class_validator_1.IsEnum)(payment_method_enum_1.PaymentMethod, { message: 'Invalid payment method' }),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Delivery address override. If omitted, uses the address from your customer profile.',
        example: '123 Main Street, Apt 4B',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Delivery address must not exceed 500 characters' }),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "deliveryAddress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Special instructions for the restaurant or rider',
        example: 'Please ring the doorbell twice. No onions on the burger.',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(1000, { message: 'Notes must not exceed 1000 characters' }),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "customerNotes", void 0);
//# sourceMappingURL=create-order.dto.js.map