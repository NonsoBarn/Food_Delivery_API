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
var PaymentsWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const payments_service_1 = require("./payments.service");
const payment_factory_service_1 = require("./payment-factory.service");
const payment_provider_enum_1 = require("./enums/payment-provider.enum");
let PaymentsWebhookController = PaymentsWebhookController_1 = class PaymentsWebhookController {
    paymentsService;
    paymentFactory;
    logger = new common_1.Logger(PaymentsWebhookController_1.name);
    constructor(paymentsService, paymentFactory) {
        this.paymentsService = paymentsService;
        this.paymentFactory = paymentFactory;
    }
    async handleStripeWebhook(req, signature) {
        if (!signature) {
            throw new common_1.BadRequestException('Missing stripe-signature header');
        }
        const rawBody = req.rawBody;
        if (!rawBody) {
            throw new common_1.BadRequestException('Missing raw body');
        }
        const paymentService = this.paymentFactory.getPaymentService(payment_provider_enum_1.PaymentProvider.STRIPE);
        if (!paymentService.verifyWebhookSignature(rawBody, signature)) {
            this.logger.error('Invalid Stripe webhook signature');
            throw new common_1.BadRequestException('Invalid signature');
        }
        const event = JSON.parse(rawBody.toString());
        await this.paymentsService.processWebhookEvent(payment_provider_enum_1.PaymentProvider.STRIPE, event);
        return { received: true };
    }
    async handlePaystackWebhook(req, signature) {
        if (!signature) {
            throw new common_1.BadRequestException('Missing x-paystack-signature header');
        }
        const rawBody = req.rawBody;
        if (!rawBody) {
            throw new common_1.BadRequestException('Missing raw body');
        }
        const paymentService = this.paymentFactory.getPaymentService(payment_provider_enum_1.PaymentProvider.PAYSTACK);
        if (!paymentService.verifyWebhookSignature(rawBody, signature)) {
            this.logger.error('Invalid Paystack webhook signature');
            throw new common_1.BadRequestException('Invalid signature');
        }
        const event = JSON.parse(rawBody.toString());
        await this.paymentsService.processWebhookEvent(payment_provider_enum_1.PaymentProvider.PAYSTACK, event);
        return { received: true };
    }
    async handleFlutterwaveWebhook(req, signature) {
        if (!signature) {
            throw new common_1.BadRequestException('Missing verif-hash header');
        }
        const rawBody = req.rawBody;
        if (!rawBody) {
            throw new common_1.BadRequestException('Missing raw body');
        }
        const paymentService = this.paymentFactory.getPaymentService(payment_provider_enum_1.PaymentProvider.FLUTTERWAVE);
        if (!paymentService.verifyWebhookSignature(rawBody, signature)) {
            this.logger.error('Invalid Flutterwave webhook signature');
            throw new common_1.BadRequestException('Invalid signature');
        }
        const event = JSON.parse(rawBody.toString());
        await this.paymentsService.processWebhookEvent(payment_provider_enum_1.PaymentProvider.FLUTTERWAVE, event);
        return { received: true };
    }
};
exports.PaymentsWebhookController = PaymentsWebhookController;
__decorate([
    (0, common_1.Post)('stripe'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Stripe webhook (public — signature-verified)', description: 'Called by Stripe. Do not call manually.' }),
    (0, swagger_1.ApiHeader)({ name: 'stripe-signature', required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '{ received: true }' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsWebhookController.prototype, "handleStripeWebhook", null);
__decorate([
    (0, common_1.Post)('paystack'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Paystack webhook (public — signature-verified)', description: 'Called by Paystack. Do not call manually.' }),
    (0, swagger_1.ApiHeader)({ name: 'x-paystack-signature', required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '{ received: true }' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-paystack-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsWebhookController.prototype, "handlePaystackWebhook", null);
__decorate([
    (0, common_1.Post)('flutterwave'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Flutterwave webhook (public — signature-verified)', description: 'Called by Flutterwave. Do not call manually.' }),
    (0, swagger_1.ApiHeader)({ name: 'verif-hash', required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '{ received: true }' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('verif-hash')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsWebhookController.prototype, "handleFlutterwaveWebhook", null);
exports.PaymentsWebhookController = PaymentsWebhookController = PaymentsWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('Webhooks'),
    (0, common_1.Controller)({
        path: 'webhooks/payments',
        version: '1',
    }),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService,
        payment_factory_service_1.PaymentFactoryService])
], PaymentsWebhookController);
//# sourceMappingURL=payments-webhook.controller.js.map