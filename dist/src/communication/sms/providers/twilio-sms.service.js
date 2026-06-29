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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var TwilioSmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioSmsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const twilio_1 = __importDefault(require("twilio"));
const sms_templates_1 = require("../templates/sms.templates");
let TwilioSmsService = TwilioSmsService_1 = class TwilioSmsService {
    configService;
    logger = new common_1.Logger(TwilioSmsService_1.name);
    client;
    fromNumber;
    isConfigured = false;
    constructor(configService) {
        this.configService = configService;
        const accountSid = this.configService.get('twilio.accountSid') ?? '';
        const authToken = this.configService.get('twilio.authToken') ?? '';
        this.fromNumber =
            this.configService.get('twilio.phoneNumber') ?? '';
        if (!accountSid.startsWith('AC') || !authToken || !this.fromNumber) {
            this.logger.warn('Twilio credentials missing or invalid — SMS service disabled');
            return;
        }
        try {
            this.client = (0, twilio_1.default)(accountSid, authToken);
            this.isConfigured = true;
            this.logger.log('Twilio SMS Service initialized');
        }
        catch (error) {
            this.logger.warn(`Twilio initialization failed — SMS service disabled: ${error}`);
        }
    }
    async sendOrderConfirmation(data) {
        await this.sendSms(data.to, (0, sms_templates_1.smsOrderConfirmation)(data.orderNumber, data.vendorName));
    }
    async sendOrderCancelled(data) {
        await this.sendSms(data.to, (0, sms_templates_1.smsOrderCancelled)(data.orderNumber));
    }
    async sendDeliveryAssigned(data) {
        await this.sendSms(data.to, (0, sms_templates_1.smsDeliveryAssigned)(data.orderNumber, data.riderName));
    }
    async sendDeliveryCompletion(data) {
        await this.sendSms(data.to, (0, sms_templates_1.smsDeliveryCompletion)(data.orderNumber));
    }
    getProviderName() {
        return 'twilio';
    }
    async sendSms(to, body) {
        if (!this.isConfigured) {
            this.logger.warn(`SMS not sent to ${to} — Twilio not configured`);
            return;
        }
        try {
            const message = await this.client.messages.create({
                to,
                from: this.fromNumber,
                body,
            });
            this.logger.log(`SMS sent via Twilio | SID: ${message.sid} | To: ${to}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Twilio failed to send SMS to ${to}: ${message}`);
            throw error;
        }
    }
};
exports.TwilioSmsService = TwilioSmsService;
exports.TwilioSmsService = TwilioSmsService = TwilioSmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TwilioSmsService);
//# sourceMappingURL=twilio-sms.service.js.map