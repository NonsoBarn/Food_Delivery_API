"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateRiderProfileDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_rider_profile_dto_1 = require("./create-rider-profile.dto");
class UpdateRiderProfileDto extends (0, swagger_1.PartialType)(create_rider_profile_dto_1.CreateRiderProfileDto) {
}
exports.UpdateRiderProfileDto = UpdateRiderProfileDto;
//# sourceMappingURL=update-rider-profile.dto.js.map