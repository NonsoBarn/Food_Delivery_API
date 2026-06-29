"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const delivery_entity_1 = require("./entities/delivery.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const rider_profile_entity_1 = require("../users/entities/rider-profile.entity");
const storage_module_1 = require("../storage/storage.module");
const delivery_controller_1 = require("./controllers/delivery.controller");
const rider_management_controller_1 = require("./controllers/rider-management.controller");
const delivery_service_1 = require("./services/delivery.service");
const rider_management_service_1 = require("./services/rider-management.service");
const rider_location_service_1 = require("./services/rider-location.service");
let DeliveryModule = class DeliveryModule {
};
exports.DeliveryModule = DeliveryModule;
exports.DeliveryModule = DeliveryModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([delivery_entity_1.Delivery, order_entity_1.Order, rider_profile_entity_1.RiderProfile]),
            storage_module_1.StorageModule,
        ],
        controllers: [delivery_controller_1.DeliveryController, rider_management_controller_1.RiderManagementController],
        providers: [delivery_service_1.DeliveryService, rider_management_service_1.RiderManagementService, rider_location_service_1.RiderLocationService],
        exports: [delivery_service_1.DeliveryService, rider_location_service_1.RiderLocationService],
    })
], DeliveryModule);
//# sourceMappingURL=delivery.module.js.map