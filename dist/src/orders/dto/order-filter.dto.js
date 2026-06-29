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
exports.OrderFilterDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const order_status_enum_1 = require("../enums/order-status.enum");
class OrderFilterDto {
    status;
    vendorId;
    customerId;
    fromDate;
    toDate;
    sortBy;
    sortOrder;
    page;
    limit;
}
exports.OrderFilterDto = OrderFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by order status',
        enum: order_status_enum_1.OrderStatus,
        example: order_status_enum_1.OrderStatus.PENDING,
    }),
    (0, class_validator_1.IsEnum)(order_status_enum_1.OrderStatus, { message: 'Invalid order status' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], OrderFilterDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by vendor ID (admin only)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, class_validator_1.IsUUID)('4', { message: 'Vendor ID must be a valid UUID' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], OrderFilterDto.prototype, "vendorId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by customer ID (admin only)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, class_validator_1.IsUUID)('4', { message: 'Customer ID must be a valid UUID' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], OrderFilterDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter orders from this date (ISO 8601)',
        example: '2026-01-01',
    }),
    (0, class_validator_1.IsDateString)({}, { message: 'fromDate must be a valid ISO 8601 date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], OrderFilterDto.prototype, "fromDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter orders up to this date (ISO 8601)',
        example: '2026-12-31',
    }),
    (0, class_validator_1.IsDateString)({}, { message: 'toDate must be a valid ISO 8601 date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], OrderFilterDto.prototype, "toDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort by field',
        enum: ['createdAt', 'total', 'status'],
        default: 'createdAt',
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], OrderFilterDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort direction',
        enum: ['ASC', 'DESC'],
        default: 'DESC',
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], OrderFilterDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Page number (1-based)',
        example: 1,
        default: 1,
    }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], OrderFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Number of orders per page',
        example: 20,
        default: 20,
    }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], OrderFilterDto.prototype, "limit", void 0);
//# sourceMappingURL=order-filter.dto.js.map