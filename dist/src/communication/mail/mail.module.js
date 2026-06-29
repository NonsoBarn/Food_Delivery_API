"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const mail_config_1 = require("./config/mail.config");
const sendgrid_config_1 = require("./config/sendgrid.config");
const email_provider_config_entity_1 = require("./entities/email-provider-config.entity");
const sendgrid_email_service_1 = require("./providers/sendgrid-email.service");
const nodemailer_email_service_1 = require("./providers/nodemailer-email.service");
const mail_factory_service_1 = require("./mail-factory.service");
const mail_service_1 = require("./mail.service");
const mail_processor_1 = require("./mail.processor");
let MailModule = class MailModule {
};
exports.MailModule = MailModule;
exports.MailModule = MailModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({ name: 'email' }),
            config_1.ConfigModule.forFeature(mail_config_1.mailConfig),
            config_1.ConfigModule.forFeature(sendgrid_config_1.sendgridConfig),
            typeorm_1.TypeOrmModule.forFeature([email_provider_config_entity_1.EmailProviderConfig]),
        ],
        providers: [
            sendgrid_email_service_1.SendGridEmailService,
            nodemailer_email_service_1.NodemailerEmailService,
            mail_factory_service_1.EmailFactoryService,
            mail_service_1.MailService,
            mail_processor_1.MailProcessor,
        ],
        exports: [
            mail_service_1.MailService,
            mail_factory_service_1.EmailFactoryService,
        ],
    })
], MailModule);
//# sourceMappingURL=mail.module.js.map