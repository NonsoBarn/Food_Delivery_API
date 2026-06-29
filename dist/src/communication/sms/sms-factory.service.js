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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SmsFactoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsFactoryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sms_provider_enum_1 = require("./enums/sms-provider.enum");
const sms_provider_config_entity_1 = require("./entities/sms-provider-config.entity");
const twilio_sms_service_1 = require("./providers/twilio-sms.service");
const africas_talking_sms_service_1 = require("./providers/africas-talking-sms.service");
let SmsFactoryService = SmsFactoryService_1 = class SmsFactoryService {
    configService;
    twilioService;
    africasTalkingService;
    configRepository;
    logger = new common_1.Logger(SmsFactoryService_1.name);
    defaultProvider;
    constructor(configService, twilioService, africasTalkingService, configRepository) {
        this.configService = configService;
        this.twilioService = twilioService;
        this.africasTalkingService = africasTalkingService;
        this.configRepository = configRepository;
        this.defaultProvider =
            this.configService.get('sms.defaultProvider') ?? 'twilio';
    }
    async getSmsService() {
        const dbConfig = await this.configRepository.findOne({
            where: { isEnabled: true },
        });
        const provider = dbConfig?.provider ?? this.defaultProvider;
        this.logger.debug(`Using SMS provider: ${provider}`);
        return this.resolveProvider(provider);
    }
    getServiceByProvider(provider) {
        return this.resolveProvider(provider);
    }
    resolveProvider(provider) {
        switch (provider) {
            case sms_provider_enum_1.SmsProvider.TWILIO:
                return this.twilioService;
            case sms_provider_enum_1.SmsProvider.AFRICAS_TALKING:
                return this.africasTalkingService;
            default:
                throw new Error(`Unknown SMS provider: "${provider}". Valid options: ${Object.values(sms_provider_enum_1.SmsProvider).join(', ')}`);
        }
    }
};
exports.SmsFactoryService = SmsFactoryService;
exports.SmsFactoryService = SmsFactoryService = SmsFactoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(sms_provider_config_entity_1.SmsProviderConfig)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        twilio_sms_service_1.TwilioSmsService,
        africas_talking_sms_service_1.AfricasTalkingSmsService,
        typeorm_2.Repository])
], SmsFactoryService);
//# sourceMappingURL=sms-factory.service.js.map