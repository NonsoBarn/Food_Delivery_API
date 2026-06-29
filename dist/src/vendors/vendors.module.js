"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const vendor_dashboard_service_1 = require("./vendor-dashboard.service");
const vendor_dashboard_controller_1 = require("./vendor-dashboard.controller");
const vendor_profile_entity_1 = require("../users/entities/vendor-profile.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const order_item_entity_1 = require("../orders/entities/order-item.entity");
const product_entity_1 = require("../products/entities/product.entity");
let VendorsModule = class VendorsModule {
};
exports.VendorsModule = VendorsModule;
exports.VendorsModule = VendorsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                vendor_profile_entity_1.VendorProfile,
                order_entity_1.Order,
                order_item_entity_1.OrderItem,
                product_entity_1.Product,
            ]),
        ],
        providers: [vendor_dashboard_service_1.VendorDashboardService],
        controllers: [vendor_dashboard_controller_1.VendorDashboardController],
    })
], VendorsModule);
//# sourceMappingURL=vendors.module.js.map