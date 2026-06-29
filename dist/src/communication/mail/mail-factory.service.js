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
var EmailFactoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailFactoryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const email_provider_enum_1 = require("./enums/email-provider.enum");
const email_provider_config_entity_1 = require("./entities/email-provider-config.entity");
const sendgrid_email_service_1 = require("./providers/sendgrid-email.service");
const nodemailer_email_service_1 = require("./providers/nodemailer-email.service");
let EmailFactoryService = EmailFactoryService_1 = class EmailFactoryService {
    configService;
    sendGridService;
    nodemailerService;
    configRepository;
    logger = new common_1.Logger(EmailFactoryService_1.name);
    defaultProvider;
    constructor(configService, sendGridService, nodemailerService, configRepository) {
        this.configService = configService;
        this.sendGridService = sendGridService;
        this.nodemailerService = nodemailerService;
        this.configRepository = configRepository;
        this.defaultProvider =
            this.configService.get('mail.defaultProvider') ?? 'sendgrid';
    }
    async getEmailService() {
        const dbConfig = await this.configRepository.findOne({
            where: { isEnabled: true },
        });
        const provider = dbConfig?.provider ?? this.defaultProvider;
        this.logger.debug(`Using email provider: ${provider}`);
        return this.resolveProvider(provider);
    }
    getServiceByProvider(provider) {
        return this.resolveProvider(provider);
    }
    resolveProvider(provider) {
        switch (provider) {
            case email_provider_enum_1.EmailProvider.SENDGRID:
                return this.sendGridService;
            case email_provider_enum_1.EmailProvider.NODEMAILER:
                return this.nodemailerService;
            default:
                throw new Error(`Unknown email provider: "${provider}". Valid options: ${Object.values(email_provider_enum_1.EmailProvider).join(', ')}`);
        }
    }
};
exports.EmailFactoryService = EmailFactoryService;
exports.EmailFactoryService = EmailFactoryService = EmailFactoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(email_provider_config_entity_1.EmailProviderConfig)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        sendgrid_email_service_1.SendGridEmailService,
        nodemailer_email_service_1.NodemailerEmailService,
        typeorm_2.Repository])
], EmailFactoryService);
//# sourceMappingURL=mail-factory.service.js.map