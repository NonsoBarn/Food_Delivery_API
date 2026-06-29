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
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const sms_type_enum_1 = require("./enums/sms-type.enum");
let SmsService = SmsService_1 = class SmsService {
    smsQueue;
    logger = new common_1.Logger(SmsService_1.name);
    constructor(smsQueue) {
        this.smsQueue = smsQueue;
    }
    defaultJobOptions = {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 100,
        removeOnFail: 500,
    };
    async queueOrderConfirmationSms(data) {
        await this.smsQueue.add(sms_type_enum_1.SmsType.ORDER_CONFIRMATION, data, this.defaultJobOptions);
        this.logger.log(`Queued order confirmation SMS to: ${data.to}`);
    }
    async queueOrderCancelledSms(data) {
        await this.smsQueue.add(sms_type_enum_1.SmsType.ORDER_CANCELLED, data, this.defaultJobOptions);
        this.logger.log(`Queued order cancelled SMS to: ${data.to}`);
    }
    async queueDeliveryAssignedSms(data) {
        await this.smsQueue.add(sms_type_enum_1.SmsType.DELIVERY_ASSIGNED, data, this.defaultJobOptions);
        this.logger.log(`Queued delivery assigned SMS to: ${data.to}`);
    }
    async queueDeliveryCompletionSms(data) {
        await this.smsQueue.add(sms_type_enum_1.SmsType.DELIVERY_COMPLETION, data, this.defaultJobOptions);
        this.logger.log(`Queued delivery completion SMS to: ${data.to}`);
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('sms')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], SmsService);
//# sourceMappingURL=sms.service.js.map