"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const sms_config_1 = require("./config/sms.config");
const twilio_config_1 = require("./config/twilio.config");
const sms_provider_config_entity_1 = require("./entities/sms-provider-config.entity");
const twilio_sms_service_1 = require("./providers/twilio-sms.service");
const africas_talking_sms_service_1 = require("./providers/africas-talking-sms.service");
const sms_factory_service_1 = require("./sms-factory.service");
const sms_service_1 = require("./sms.service");
const sms_processor_1 = require("./sms.processor");
let SmsModule = class SmsModule {
};
exports.SmsModule = SmsModule;
exports.SmsModule = SmsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({ name: 'sms' }),
            config_1.ConfigModule.forFeature(sms_config_1.smsConfig),
            config_1.ConfigModule.forFeature(twilio_config_1.twilioConfig),
            typeorm_1.TypeOrmModule.forFeature([sms_provider_config_entity_1.SmsProviderConfig]),
        ],
        providers: [
            twilio_sms_service_1.TwilioSmsService,
            africas_talking_sms_service_1.AfricasTalkingSmsService,
            sms_factory_service_1.SmsFactoryService,
            sms_service_1.SmsService,
            sms_processor_1.SmsProcessor,
        ],
        exports: [sms_service_1.SmsService, sms_factory_service_1.SmsFactoryService],
    })
], SmsModule);
//# sourceMappingURL=sms.module.js.map