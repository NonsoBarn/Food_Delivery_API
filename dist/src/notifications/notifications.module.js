"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const notifications_gateway_1 = require("./gateways/notifications.gateway");
const order_events_listener_1 = require("./listeners/order-events.listener");
const delivery_events_listener_1 = require("./listeners/delivery-events.listener");
const notifications_service_1 = require("./notifications.service");
const notifications_controller_1 = require("./notifications.controller");
const notification_entity_1 = require("./entities/notification.entity");
const users_module_1 = require("../users/users.module");
const delivery_module_1 = require("../delivery/delivery.module");
const customer_profile_entity_1 = require("../users/entities/customer-profile.entity");
const vendor_profile_entity_1 = require("../users/entities/vendor-profile.entity");
const rider_profile_entity_1 = require("../users/entities/rider-profile.entity");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.registerAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET', 'default-access-secret'),
                }),
            }),
            typeorm_1.TypeOrmModule.forFeature([
                notification_entity_1.Notification,
                customer_profile_entity_1.CustomerProfile,
                vendor_profile_entity_1.VendorProfile,
                rider_profile_entity_1.RiderProfile,
            ]),
            users_module_1.UsersModule,
            delivery_module_1.DeliveryModule,
        ],
        controllers: [
            notifications_controller_1.NotificationsController,
        ],
        providers: [
            notifications_gateway_1.NotificationsGateway,
            order_events_listener_1.OrderEventsListener,
            delivery_events_listener_1.DeliveryEventsListener,
            notifications_service_1.NotificationService,
        ],
        exports: [
            notifications_service_1.NotificationService,
        ],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map