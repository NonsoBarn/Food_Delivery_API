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
exports.VendorActionDto = void 0;
const class_validator_1 = require("class-validator");
const class_validator_2 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const vendor_profile_entity_1 = require("../../users/entities/vendor-profile.entity");
class VendorActionDto {
    status;
    rejectionReason;
    suspensionReason;
}
exports.VendorActionDto = VendorActionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: vendor_profile_entity_1.VendorStatus, example: vendor_profile_entity_1.VendorStatus.APPROVED }),
    (0, class_validator_1.IsEnum)(vendor_profile_entity_1.VendorStatus, {
        message: `status must be one of: ${Object.values(vendor_profile_entity_1.VendorStatus).join(', ')}`,
    }),
    __metadata("design:type", String)
], VendorActionDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Documents are incomplete', description: 'Required when status is rejected' }),
    (0, class_validator_2.ValidateIf)((dto) => dto.status === vendor_profile_entity_1.VendorStatus.REJECTED),
    (0, class_validator_1.IsString)({ message: 'Rejection reason must be a string' }),
    __metadata("design:type", String)
], VendorActionDto.prototype, "rejectionReason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Multiple customer complaints' }),
    (0, class_validator_1.IsString)({ message: 'Suspension reason must be a string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VendorActionDto.prototype, "suspensionReason", void 0);
//# sourceMappingURL=vendor-action.dto.js.map