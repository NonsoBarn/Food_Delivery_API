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
exports.UpdateProviderConfigDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateProviderConfigDto {
    isEnabled;
    displayName;
    description;
    supportedCurrencies;
    platformFeePercentage;
    platformFeeFixed;
}
exports.UpdateProviderConfigDto = UpdateProviderConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Enable or disable this provider for customers',
        example: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateProviderConfigDto.prototype, "isEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Display name shown to customers at checkout',
        example: 'Pay with Card (Stripe)',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateProviderConfigDto.prototype, "displayName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Description shown on the checkout page',
        example: 'Secure card payment powered by Stripe',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProviderConfigDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Currencies supported by this provider on the platform',
        example: ['USD', 'EUR'],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateProviderConfigDto.prototype, "supportedCurrencies", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Platform fee as percentage (e.g., 15.00 = 15%)',
        example: 15.0,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateProviderConfigDto.prototype, "platformFeePercentage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fixed platform fee per transaction',
        example: 0.5,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateProviderConfigDto.prototype, "platformFeeFixed", void 0);
//# sourceMappingURL=update-provider-config.dto.js.map