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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentLog = void 0;
const typeorm_1 = require("typeorm");
const payment_provider_enum_1 = require("../enums/payment-provider.enum");
const payment_event_type_enum_1 = require("../enums/payment-event-type.enum");
let PaymentLog = class PaymentLog {
    id;
    paymentId;
    provider;
    eventType;
    providerEventId;
    payload;
    processed;
    processedAt;
    processingError;
    signatureVerified;
    createdAt;
};
exports.PaymentLog = PaymentLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PaymentLog.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: payment_provider_enum_1.PaymentProvider }),
    __metadata("design:type", String)
], PaymentLog.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: payment_event_type_enum_1.PaymentEventType }),
    __metadata("design:type", String)
], PaymentLog.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], PaymentLog.prototype, "providerEventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], PaymentLog.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PaymentLog.prototype, "processed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], PaymentLog.prototype, "processedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PaymentLog.prototype, "processingError", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PaymentLog.prototype, "signatureVerified", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PaymentLog.prototype, "createdAt", void 0);
exports.PaymentLog = PaymentLog = __decorate([
    (0, typeorm_1.Entity)('payment_logs'),
    (0, typeorm_1.Index)(['paymentId']),
    (0, typeorm_1.Index)(['provider', 'eventType']),
    (0, typeorm_1.Index)(['providerEventId', 'provider'], { unique: true, where: '"providerEventId" IS NOT NULL' })
], PaymentLog);
//# sourceMappingURL=payment-log.entity.js.map