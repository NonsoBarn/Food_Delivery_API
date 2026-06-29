"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const mail_module_1 = require("./mail/mail.module");
const sms_module_1 = require("./sms/sms.module");
const communication_events_listener_1 = require("./listeners/communication-events.listener");
const customer_profile_entity_1 = require("../users/entities/customer-profile.entity");
const vendor_profile_entity_1 = require("../users/entities/vendor-profile.entity");
const order_entity_1 = require("../orders/entities/order.entity");
let CommunicationModule = class CommunicationModule {
};
exports.CommunicationModule = CommunicationModule;
exports.CommunicationModule = CommunicationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mail_module_1.MailModule,
            sms_module_1.SmsModule,
            typeorm_1.TypeOrmModule.forFeature([customer_profile_entity_1.CustomerProfile, vendor_profile_entity_1.VendorProfile, order_entity_1.Order]),
        ],
        providers: [communication_events_listener_1.CommunicationEventsListener],
        exports: [mail_module_1.MailModule, sms_module_1.SmsModule],
    })
], CommunicationModule);
//# sourceMappingURL=communication.module.js.map