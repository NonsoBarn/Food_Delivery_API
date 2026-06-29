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
exports.UpdateOrderStatusDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const order_status_enum_1 = require("../enums/order-status.enum");
class UpdateOrderStatusDto {
    status;
    cancellationReason;
    estimatedPrepTimeMinutes;
}
exports.UpdateOrderStatusDto = UpdateOrderStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'New order status',
        enum: order_status_enum_1.OrderStatus,
        example: order_status_enum_1.OrderStatus.CONFIRMED,
    }),
    (0, class_validator_1.IsEnum)(order_status_enum_1.OrderStatus, { message: 'Invalid order status' }),
    __metadata("design:type", String)
], UpdateOrderStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Reason for cancellation (required when status is "cancelled")',
        example: 'Out of ingredients for this dish',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Cancellation reason must not exceed 500 characters' }),
    __metadata("design:type", String)
], UpdateOrderStatusDto.prototype, "cancellationReason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Estimated preparation time in minutes. Set by vendor when confirming the order.',
        example: 30,
        minimum: 1,
        maximum: 180,
    }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'Estimated prep time must be an integer' }),
    (0, class_validator_1.Min)(1, { message: 'Estimated prep time must be at least 1 minute' }),
    (0, class_validator_1.Max)(180, { message: 'Estimated prep time cannot exceed 180 minutes' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateOrderStatusDto.prototype, "estimatedPrepTimeMinutes", void 0);
//# sourceMappingURL=update-order-status.dto.js.map