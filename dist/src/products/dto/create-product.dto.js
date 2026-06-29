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
exports.CreateProductDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const product_status_enum_1 = require("../enums/product-status.enum");
class CreateProductDto {
    name;
    description;
    price;
    categoryId;
    sku;
    stock;
    lowStockThreshold;
    status;
}
exports.CreateProductDto = CreateProductDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Product name',
        example: 'Classic Beef Burger',
        minLength: 3,
        maxLength: 100,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Product name is required' }),
    (0, class_validator_1.MinLength)(3, { message: 'Product name must be at least 3 characters' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Product name must not exceed 100 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Detailed product description',
        example: 'Juicy beef patty with fresh vegetables and special sauce',
        minLength: 10,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Product description is required' }),
    (0, class_validator_1.MinLength)(10, { message: 'Description must be at least 10 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Product price in base currency',
        example: 8.99,
        minimum: 0.01,
        maximum: 99999999.99,
    }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: 'Price must be a number with maximum 2 decimal places' }),
    (0, class_validator_1.Min)(0.01, { message: 'Price must be at least 0.01' }),
    (0, class_validator_1.Max)(99999999.99, { message: 'Price is too high' }),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Category ID the product belongs to',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, class_validator_1.IsUUID)('4', { message: 'Category ID must be a valid UUID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Category ID is required' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Stock Keeping Unit (vendor internal code)',
        example: 'BURG-001',
        maxLength: 100,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100, { message: 'SKU must not exceed 100 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "sku", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Stock quantity (0=out of stock, -1=unlimited, >0=quantity)',
        example: 50,
        default: 0,
    }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'Stock must be an integer' }),
    (0, class_validator_1.Min)(-1, { message: 'Stock must be -1 (unlimited) or greater' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "stock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Alert vendor when stock falls below this number',
        example: 10,
        minimum: 1,
    }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'Low stock threshold must be an integer' }),
    (0, class_validator_1.Min)(1, { message: 'Low stock threshold must be at least 1' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "lowStockThreshold", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Product status',
        enum: product_status_enum_1.ProductStatus,
        default: product_status_enum_1.ProductStatus.DRAFT,
    }),
    (0, class_validator_1.IsEnum)(product_status_enum_1.ProductStatus, { message: 'Invalid product status' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "status", void 0);
//# sourceMappingURL=create-product.dto.js.map