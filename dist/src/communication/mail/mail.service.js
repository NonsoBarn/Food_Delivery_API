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
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const email_type_enum_1 = require("./enums/email-type.enum");
let MailService = MailService_1 = class MailService {
    emailQueue;
    logger = new common_1.Logger(MailService_1.name);
    constructor(emailQueue) {
        this.emailQueue = emailQueue;
    }
    defaultJobOptions = {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
    };
    async queueWelcomeEmail(to, role) {
        await this.emailQueue.add(email_type_enum_1.EmailType.WELCOME, { to, role }, this.defaultJobOptions);
        this.logger.log(`Queued welcome email for: ${to}`);
    }
    async queueOrderConfirmationEmail(data) {
        await this.emailQueue.add(email_type_enum_1.EmailType.ORDER_CONFIRMATION, data, this.defaultJobOptions);
        this.logger.log(`Queued order confirmation email for: ${data.to} (${data.orderNumber})`);
    }
    async queueOrderStatusUpdateEmail(data) {
        await this.emailQueue.add(email_type_enum_1.EmailType.ORDER_STATUS_UPDATE, data, this.defaultJobOptions);
        this.logger.log(`Queued order status update email for: ${data.to} (${data.orderNumber} → ${data.newStatus})`);
    }
    async queueDeliveryCompletionEmail(data) {
        await this.emailQueue.add(email_type_enum_1.EmailType.DELIVERY_COMPLETION, data, this.defaultJobOptions);
        this.logger.log(`Queued delivery completion email for: ${data.to} (${data.orderNumber})`);
    }
    async queueAbandonedCartEmail(to, cartItemCount) {
        await this.emailQueue.add(email_type_enum_1.EmailType.ABANDONED_CART, { to, cartItemCount }, {
            ...this.defaultJobOptions,
            priority: 10,
        });
        this.logger.log(`Queued abandoned cart reminder for: ${to} (${cartItemCount} items)`);
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('email')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], MailService);
//# sourceMappingURL=mail.service.js.map