"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const users_service_1 = require("./users.service");
const users_controller_1 = require("./users.controller");
const user_entity_1 = require("./entities/user.entity");
const customer_profile_entity_1 = require("./entities/customer-profile.entity");
const vendor_profile_entity_1 = require("./entities/vendor-profile.entity");
const rider_profile_entity_1 = require("./entities/rider-profile.entity");
const profile_controller_1 = require("./profile.controller");
const profile_service_1 = require("./profile.service");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                customer_profile_entity_1.CustomerProfile,
                vendor_profile_entity_1.VendorProfile,
                rider_profile_entity_1.RiderProfile,
            ]),
        ],
        controllers: [users_controller_1.UsersController, profile_controller_1.ProfileController],
        providers: [users_service_1.UsersService, profile_service_1.ProfileService],
        exports: [users_service_1.UsersService, profile_service_1.ProfileService],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map