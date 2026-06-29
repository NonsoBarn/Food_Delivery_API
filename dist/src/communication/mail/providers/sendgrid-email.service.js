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
var SendGridEmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendGridEmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mail_1 = __importDefault(require("@sendgrid/mail"));
const welcome_template_1 = require("../templates/welcome.template");
const order_confirmation_template_1 = require("../templates/order-confirmation.template");
const order_status_update_template_1 = require("../templates/order-status-update.template");
const delivery_completion_template_1 = require("../templates/delivery-completion.template");
let SendGridEmailService = SendGridEmailService_1 = class SendGridEmailService {
    configService;
    logger = new common_1.Logger(SendGridEmailService_1.name);
    fromEmail;
    fromName;
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('sendgrid.apiKey') ?? '';
        mail_1.default.setApiKey(apiKey);
        this.fromEmail =
            this.configService.get('sendgrid.fromEmail') ?? '';
        this.fromName =
            this.configService.get('sendgrid.fromName') ??
                'Food Delivery App';
    }
    async sendWelcome(to, role) {
        await this.sendEmail({
            to,
            subject: (0, welcome_template_1.welcomeEmailSubject)(),
            html: (0, welcome_template_1.welcomeEmailHtml)(to, role),
        });
    }
    async sendOrderConfirmation(data) {
        await this.sendEmail({
            to: data.to,
            subject: (0, order_confirmation_template_1.orderConfirmationSubject)(data.orderNumber),
            html: (0, order_confirmation_template_1.orderConfirmationHtml)(data),
        });
    }
    async sendOrderStatusUpdate(data) {
        await this.sendEmail({
            to: data.to,
            subject: (0, order_status_update_template_1.orderStatusUpdateSubject)(data.orderNumber, data.newStatus),
            html: (0, order_status_update_template_1.orderStatusUpdateHtml)(data),
        });
    }
    async sendDeliveryCompletion(data) {
        await this.sendEmail({
            to: data.to,
            subject: (0, delivery_completion_template_1.deliveryCompletionSubject)(data.orderNumber),
            html: (0, delivery_completion_template_1.deliveryCompletionHtml)(data),
        });
    }
    getProviderName() {
        return 'sendgrid';
    }
    async sendEmail(params) {
        try {
            await mail_1.default.send({
                to: params.to,
                from: { email: this.fromEmail, name: this.fromName },
                subject: params.subject,
                html: params.html,
            });
            this.logger.log(`Email sent via SendGrid to: ${params.to} | Subject: ${params.subject}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`SendGrid failed to send to ${params.to}: ${message}`);
            throw error;
        }
    }
};
exports.SendGridEmailService = SendGridEmailService;
exports.SendGridEmailService = SendGridEmailService = SendGridEmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SendGridEmailService);
//# sourceMappingURL=sendgrid-email.service.js.map