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
exports.CreateRiderProfileDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const rider_profile_entity_1 = require("../entities/rider-profile.entity");
class CreateRiderProfileDto {
    phoneNumber;
    firstName;
    lastName;
    vehicleType;
    vehicleModel;
    vehiclePlateNumber;
    vehicleColor;
}
exports.CreateRiderProfileDto = CreateRiderProfileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+2348012345678' }),
    (0, class_validator_1.IsPhoneNumber)(undefined, { message: 'Please provide a valid phone number' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRiderProfileDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'James' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRiderProfileDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Okafor' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRiderProfileDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: rider_profile_entity_1.VehicleType, example: rider_profile_entity_1.VehicleType.MOTORCYCLE }),
    (0, class_validator_1.IsEnum)(rider_profile_entity_1.VehicleType, {
        message: `Vehicle type must be one of: ${Object.values(rider_profile_entity_1.VehicleType).join(', ')}`,
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Vehicle type is required' }),
    __metadata("design:type", String)
], CreateRiderProfileDto.prototype, "vehicleType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Honda CB300R' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRiderProfileDto.prototype, "vehicleModel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'LAG-123-AB' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRiderProfileDto.prototype, "vehiclePlateNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Red' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRiderProfileDto.prototype, "vehicleColor", void 0);
//# sourceMappingURL=create-rider-profile.dto.js.map