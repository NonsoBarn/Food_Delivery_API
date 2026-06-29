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
exports.UploadProductImageDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class UploadProductImageDto {
    altText;
    isPrimary;
    displayOrder;
}
exports.UploadProductImageDto = UploadProductImageDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Alternative text for accessibility and SEO',
        example: 'Classic beef burger with fresh vegetables',
        maxLength: 255,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255, { message: 'Alt text must not exceed 255 characters' }),
    __metadata("design:type", String)
], UploadProductImageDto.prototype, "altText", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Set as primary/featured image',
        default: false,
    }),
    (0, class_transformer_1.Type)(() => Boolean),
    (0, class_validator_1.IsBoolean)({ message: 'isPrimary must be a boolean' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UploadProductImageDto.prototype, "isPrimary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Display order in gallery (lower numbers first)',
        example: 1,
        minimum: 1,
    }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'Display order must be an integer' }),
    (0, class_validator_1.Min)(1, { message: 'Display order must be at least 1' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UploadProductImageDto.prototype, "displayOrder", void 0);
//# sourceMappingURL=upload-product-image.dto.js.map