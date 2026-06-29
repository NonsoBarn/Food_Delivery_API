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
exports.UpdateAvailabilityDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const rider_profile_entity_1 = require("../../users/entities/rider-profile.entity");
class UpdateAvailabilityDto {
    availabilityStatus;
}
exports.UpdateAvailabilityDto = UpdateAvailabilityDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: [rider_profile_entity_1.AvailabilityStatus.ONLINE, rider_profile_entity_1.AvailabilityStatus.OFFLINE],
        example: rider_profile_entity_1.AvailabilityStatus.ONLINE,
        description: 'Riders can only set online or offline (busy is system-managed)',
    }),
    (0, class_validator_1.IsEnum)(rider_profile_entity_1.AvailabilityStatus),
    (0, class_validator_1.IsIn)([rider_profile_entity_1.AvailabilityStatus.ONLINE, rider_profile_entity_1.AvailabilityStatus.OFFLINE], {
        message: 'You can only set availability to online or offline',
    }),
    __metadata("design:type", String)
], UpdateAvailabilityDto.prototype, "availabilityStatus", void 0);
//# sourceMappingURL=update-availability.dto.js.map