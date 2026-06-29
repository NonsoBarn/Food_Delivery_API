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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const payment_entity_1 = require("./entities/payment.entity");
const payment_log_entity_1 = require("./entities/payment-log.entity");
const payment_provider_config_entity_1 = require("./entities/payment-provider-config.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const payment_factory_service_1 = require("./payment-factory.service");
const payment_provider_enum_1 = require("./enums/payment-provider.enum");
const payment_event_type_enum_1 = require("./enums/payment-event-type.enum");
const payment_status_enum_1 = require("../orders/enums/payment-status.enum");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    paymentRepository;
    paymentLogRepository;
    providerConfigRepository;
    orderRepository;
    paymentFactory;
    configService;
    dataSource;
    logger = new common_1.Logger(PaymentsService_1.name);
    constructor(paymentRepository, paymentLogRepository, providerConfigRepository, orderRepository, paymentFactory, configService, dataSource) {
        this.paymentRepository = paymentRepository;
        this.paymentLogRepository = paymentLogRepository;
        this.providerConfigRepository = providerConfigRepository;
        this.orderRepository = orderRepository;
        this.paymentFactory = paymentFactory;
        this.configService = configService;
        this.dataSource = dataSource;
    }
    async getAllProviderConfigs() {
        return this.providerConfigRepository.find({
            order: { provider: 'ASC' },
        });
    }
    async getEnabledProviders() {
        return this.providerConfigRepository.find({
            where: { isEnabled: true },
            order: { provider: 'ASC' },
        });
    }
    async updateProviderConfig(provider, dto) {
        let config = await this.providerConfigRepository.findOne({
            where: { provider },
        });
        if (!config) {
            config = this.providerConfigRepository.create({ provider });
        }
        Object.assign(config, dto);
        return this.providerConfigRepository.save(config);
    }
    async initializePayment(orderGroupId, customerId, customerEmail, provider, callbackUrl) {
        const providerConfig = await this.providerConfigRepository.findOne({
            where: { provider, isEnabled: true },
        });
        if (!providerConfig) {
            throw new common_1.BadRequestException(`Payment provider "${provider}" is not enabled on this platform`);
        }
        const orders = await this.orderRepository.find({
            where: { orderGroupId },
        });
        if (!orders.length) {
            throw new common_1.NotFoundException('No orders found for this order group');
        }
        if (orders.some((o) => o.customerId !== customerId)) {
            throw new common_1.BadRequestException('Order group does not belong to this customer');
        }
        if (orders.some((o) => o.paymentStatus !== payment_status_enum_1.PaymentStatus.PENDING)) {
            throw new common_1.BadRequestException('One or more orders already have a payment in progress');
        }
        const totalAmount = orders.reduce((sum, order) => sum + Number(order.total), 0);
        const paymentService = this.paymentFactory.getPaymentService(provider);
        const initResult = await paymentService.initializePayment(totalAmount, providerConfig.supportedCurrencies?.[0] || 'USD', {
            customerEmail,
            orderGroupId,
            customerId,
            callbackUrl,
        });
        const payment = this.paymentRepository.create({
            orderGroupId,
            provider,
            transactionId: initResult.transactionId,
            transactionType: payment_entity_1.PaymentTransactionType.CHARGE,
            amount: totalAmount,
            currency: providerConfig.supportedCurrencies?.[0] || 'USD',
            status: payment_status_enum_1.PaymentStatus.PENDING,
            customerId,
            customerEmail,
            metadata: {
                orderIds: orders.map((o) => o.id),
                providerResponse: initResult,
            },
        });
        await this.paymentRepository.save(payment);
        await this.logEvent(payment.id, provider, payment_event_type_enum_1.PaymentEventType.PAYMENT_INITIATED, null, initResult, true);
        this.logger.log(`Payment initialized: ${payment.id} via ${provider} for group ${orderGroupId}`);
        return {
            paymentId: payment.id,
            provider,
            amount: totalAmount,
            currency: payment.currency,
            transactionId: initResult.transactionId,
            checkoutUrl: initResult.checkoutUrl,
            clientSecret: initResult.clientSecret,
            metadata: initResult.metadata,
        };
    }
    async verifyPayment(reference) {
        const payment = await this.paymentRepository.findOne({
            where: { transactionId: reference },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found for this reference');
        }
        if (payment.status === payment_status_enum_1.PaymentStatus.PAID) {
            return { success: true, alreadyProcessed: true, payment };
        }
        const paymentService = this.paymentFactory.getPaymentService(payment.provider);
        const result = await paymentService.verifyPayment(reference);
        await this.dataSource.transaction(async (manager) => {
            if (result.success) {
                payment.status = payment_status_enum_1.PaymentStatus.PAID;
                payment.paidAt = result.paidAt || new Date();
                await manager.update(order_entity_1.Order, { orderGroupId: payment.orderGroupId }, { paymentStatus: payment_status_enum_1.PaymentStatus.PAID });
                await this.logEvent(payment.id, payment.provider, payment_event_type_enum_1.PaymentEventType.PAYMENT_SUCCESSFUL, null, result, true);
            }
            else if (result.status === 'failed') {
                payment.status = payment_status_enum_1.PaymentStatus.FAILED;
                payment.failedAt = new Date();
                payment.errorMessage = result.errorMessage || '';
                await this.logEvent(payment.id, payment.provider, payment_event_type_enum_1.PaymentEventType.PAYMENT_FAILED, null, result, true);
            }
            await manager.save(payment_entity_1.Payment, payment);
        });
        return { success: result.success, payment };
    }
    async refundPayment(paymentId, amount, reason) {
        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.status !== payment_status_enum_1.PaymentStatus.PAID) {
            throw new common_1.BadRequestException('Only successful payments can be refunded');
        }
        if (payment.isRefunded) {
            throw new common_1.BadRequestException('Payment has already been refunded');
        }
        const paymentService = this.paymentFactory.getPaymentService(payment.provider);
        const refundResult = await paymentService.refundPayment(payment.transactionId, amount, reason);
        const refund = this.paymentRepository.create({
            orderGroupId: payment.orderGroupId,
            provider: payment.provider,
            transactionId: refundResult.refundId || `refund-${payment.id}-${Date.now()}`,
            transactionType: payment_entity_1.PaymentTransactionType.REFUND,
            amount: refundResult.amount || amount || Number(payment.amount),
            currency: payment.currency,
            status: refundResult.success ? payment_status_enum_1.PaymentStatus.PAID : payment_status_enum_1.PaymentStatus.PENDING,
            refundedPaymentId: payment.id,
            customerId: payment.customerId,
            customerEmail: payment.customerEmail,
            metadata: { reason, originalPaymentId: payment.id },
        });
        await this.dataSource.transaction(async (manager) => {
            await manager.save(payment_entity_1.Payment, refund);
            payment.isRefunded = true;
            payment.refundedAmount = refund.amount;
            payment.refundedAt = new Date();
            await manager.save(payment_entity_1.Payment, payment);
            if (refundResult.success) {
                await manager.update(order_entity_1.Order, { orderGroupId: payment.orderGroupId }, { paymentStatus: payment_status_enum_1.PaymentStatus.REFUNDED });
            }
            await this.logEvent(refund.id, payment.provider, refundResult.success
                ? payment_event_type_enum_1.PaymentEventType.REFUND_SUCCESSFUL
                : payment_event_type_enum_1.PaymentEventType.REFUND_INITIATED, null, refundResult, true);
        });
        this.logger.log(`Refund processed: ${refund.id} for payment ${payment.id}`);
        return { success: refundResult.success, refund };
    }
    async processWebhookEvent(provider, event) {
        const providerEventId = this.extractEventId(provider, event);
        if (providerEventId) {
            const existing = await this.paymentLogRepository.findOne({
                where: { providerEventId, provider },
            });
            if (existing?.processed) {
                this.logger.log(`Skipping duplicate webhook: ${providerEventId} (${provider})`);
                return { processed: false, reason: 'duplicate' };
            }
        }
        const reference = this.extractTransactionReference(provider, event);
        if (!reference) {
            this.logger.warn(`Could not extract reference from ${provider} webhook`);
            await this.logEvent(null, provider, payment_event_type_enum_1.PaymentEventType.PAYMENT_FAILED, providerEventId, event, true);
            return { processed: false, reason: 'no_reference' };
        }
        const result = await this.verifyPayment(reference);
        await this.logEvent(result.payment?.id || null, provider, result.success
            ? payment_event_type_enum_1.PaymentEventType.PAYMENT_SUCCESSFUL
            : payment_event_type_enum_1.PaymentEventType.PAYMENT_FAILED, providerEventId, event, true);
        return { processed: true, success: result.success };
    }
    async findOne(id) {
        const payment = await this.paymentRepository.findOne({
            where: { id },
            relations: ['order'],
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        return payment;
    }
    async findByOrderGroup(orderGroupId) {
        return this.paymentRepository.find({
            where: { orderGroupId },
            order: { createdAt: 'DESC' },
        });
    }
    extractEventId(provider, event) {
        switch (provider) {
            case payment_provider_enum_1.PaymentProvider.STRIPE:
                return event.id || null;
            case payment_provider_enum_1.PaymentProvider.PAYSTACK:
                return event.data?.id ? String(event.data.id) : null;
            case payment_provider_enum_1.PaymentProvider.FLUTTERWAVE:
                return event.data?.id ? String(event.data.id) : null;
            default:
                return null;
        }
    }
    extractTransactionReference(provider, event) {
        switch (provider) {
            case payment_provider_enum_1.PaymentProvider.STRIPE:
                return event.data?.object?.id || null;
            case payment_provider_enum_1.PaymentProvider.PAYSTACK:
                return event.data?.reference || null;
            case payment_provider_enum_1.PaymentProvider.FLUTTERWAVE:
                return event.data?.tx_ref || null;
            default:
                return null;
        }
    }
    async logEvent(paymentId, provider, eventType, providerEventId, payload, signatureVerified) {
        const log = new payment_log_entity_1.PaymentLog();
        log.paymentId = paymentId;
        log.provider = provider;
        log.eventType = eventType;
        log.providerEventId = providerEventId;
        log.payload = payload;
        log.signatureVerified = signatureVerified;
        log.processed = true;
        log.processedAt = new Date();
        await this.paymentLogRepository.save(log);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_log_entity_1.PaymentLog)),
    __param(2, (0, typeorm_1.InjectRepository)(payment_provider_config_entity_1.PaymentProviderConfig)),
    __param(3, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        payment_factory_service_1.PaymentFactoryService,
        config_1.ConfigService,
        typeorm_2.DataSource])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map