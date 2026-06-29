"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCustomerProfileDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_customer_profile_dto_1 = require("./create-customer-profile.dto");
class UpdateCustomerProfileDto extends (0, swagger_1.PartialType)(create_customer_profile_dto_1.CreateCustomerProfileDto) {
}
exports.UpdateCustomerProfileDto = UpdateCustomerProfileDto;
//# sourceMappingURL=update-customer-profile.dto.js.map