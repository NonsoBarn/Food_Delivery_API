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
var SmsProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsProcessor = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const sms_factory_service_1 = require("./sms-factory.service");
const sms_type_enum_1 = require("./enums/sms-type.enum");
let SmsProcessor = SmsProcessor_1 = class SmsProcessor extends bullmq_1.WorkerHost {
    factory;
    logger = new common_1.Logger(SmsProcessor_1.name);
    constructor(factory) {
        super();
        this.factory = factory;
    }
    async process(job) {
        this.logger.log(`Processing SMS job: ${job.name} (id: ${job.id})`);
        const smsService = await this.factory.getSmsService();
        switch (job.name) {
            case sms_type_enum_1.SmsType.ORDER_CONFIRMATION: {
                const data = job.data;
                await smsService.sendOrderConfirmation(data);
                break;
            }
            case sms_type_enum_1.SmsType.ORDER_CANCELLED: {
                const data = job.data;
                await smsService.sendOrderCancelled(data);
                break;
            }
            case sms_type_enum_1.SmsType.DELIVERY_ASSIGNED: {
                const data = job.data;
                await smsService.sendDeliveryAssigned(data);
                break;
            }
            case sms_type_enum_1.SmsType.DELIVERY_COMPLETION: {
                const data = job.data;
                await smsService.sendDeliveryCompletion(data);
                break;
            }
            default:
                this.logger.warn(`Unknown SMS job type: ${job.name}. Skipping.`);
        }
    }
    onCompleted(job) {
        this.logger.log(`SMS job completed: ${job.name} (id: ${job.id})`);
    }
    onFailed(job, error) {
        this.logger.error(`SMS job FAILED: ${job.name} (id: ${job.id}) | attempt ${job.attemptsMade}/${job.opts.attempts} | Error: ${error.message}`);
    }
};
exports.SmsProcessor = SmsProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], SmsProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], SmsProcessor.prototype, "onFailed", null);
exports.SmsProcessor = SmsProcessor = SmsProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('sms'),
    __metadata("design:paramtypes", [sms_factory_service_1.SmsFactoryService])
], SmsProcessor);
//# sourceMappingURL=sms.processor.js.map