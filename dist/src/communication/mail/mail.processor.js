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
var MailProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailProcessor = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const mail_factory_service_1 = require("./mail-factory.service");
const email_type_enum_1 = require("./enums/email-type.enum");
let MailProcessor = MailProcessor_1 = class MailProcessor extends bullmq_1.WorkerHost {
    factory;
    logger = new common_1.Logger(MailProcessor_1.name);
    constructor(factory) {
        super();
        this.factory = factory;
    }
    async process(job) {
        this.logger.log(`Processing email job: ${job.name} (id: ${job.id})`);
        const emailService = await this.factory.getEmailService();
        switch (job.name) {
            case email_type_enum_1.EmailType.WELCOME: {
                const { to, role } = job.data;
                await emailService.sendWelcome(to, role);
                break;
            }
            case email_type_enum_1.EmailType.ORDER_CONFIRMATION: {
                const data = job.data;
                await emailService.sendOrderConfirmation(data);
                break;
            }
            case email_type_enum_1.EmailType.ORDER_STATUS_UPDATE: {
                const data = job.data;
                await emailService.sendOrderStatusUpdate(data);
                break;
            }
            case email_type_enum_1.EmailType.DELIVERY_COMPLETION: {
                const data = job.data;
                await emailService.sendDeliveryCompletion(data);
                break;
            }
            case email_type_enum_1.EmailType.ABANDONED_CART: {
                const { to, cartItemCount } = job.data;
                this.logger.log(`[ABANDONED_CART] Reminder email queued for ${to} (${cartItemCount} items). ` +
                    `Implement sendAbandonedCart() in IEmailService to send real emails.`);
                break;
            }
            default:
                this.logger.warn(`Unknown email job type: ${job.name}. Skipping.`);
        }
    }
    onCompleted(job) {
        this.logger.log(`Email job completed: ${job.name} (id: ${job.id}) — provider: ${job.data?.to}`);
    }
    onFailed(job, error) {
        this.logger.error(`Email job FAILED: ${job.name} (id: ${job.id}) | attempt ${job.attemptsMade}/${job.opts.attempts} | Error: ${error.message}`);
    }
    onActive(job) {
        this.logger.debug(`Email job started: ${job.name} (id: ${job.id})`);
    }
};
exports.MailProcessor = MailProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], MailProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], MailProcessor.prototype, "onFailed", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], MailProcessor.prototype, "onActive", null);
exports.MailProcessor = MailProcessor = MailProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('email'),
    __metadata("design:paramtypes", [mail_factory_service_1.EmailFactoryService])
], MailProcessor);
//# sourceMappingURL=mail.processor.js.map