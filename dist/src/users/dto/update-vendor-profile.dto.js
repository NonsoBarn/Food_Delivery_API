"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateVendorProfileDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_vendor_profile_dto_1 = require("./create-vendor-profile.dto");
class UpdateVendorProfileDto extends (0, swagger_1.PartialType)(create_vendor_profile_dto_1.CreateVendorProfileDto) {
}
exports.UpdateVendorProfileDto = UpdateVendorProfileDto;
//# sourceMappingURL=update-vendor-profile.dto.js.map