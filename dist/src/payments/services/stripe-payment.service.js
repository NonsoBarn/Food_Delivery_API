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
var StripePaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripePaymentService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
let StripePaymentService = StripePaymentService_1 = class StripePaymentService {
    configService;
    logger = new common_1.Logger(StripePaymentService_1.name);
    stripe = null;
    webhookSecret;
    constructor(configService) {
        this.configService = configService;
        const secretKey = this.configService.get('stripe.secretKey');
        this.webhookSecret = this.configService.get('stripe.webhookSecret') || '';
        if (secretKey) {
            this.stripe = new stripe_1.default(secretKey);
            this.logger.log('Stripe Payment Service initialized');
        }
        else {
            this.logger.warn('Stripe secret key not configured — service will be unavailable');
        }
    }
    ensureInitialized() {
        if (!this.stripe) {
            throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in environment.');
        }
        return this.stripe;
    }
    async initializePayment(amount, currency, metadata) {
        const stripe = this.ensureInitialized();
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: currency.toLowerCase(),
            metadata: {
                orderId: metadata.orderId || '',
                orderGroupId: metadata.orderGroupId || '',
                customerId: metadata.customerId || '',
            },
            receipt_email: metadata.customerEmail,
        });
        this.logger.log(`Stripe PaymentIntent created: ${paymentIntent.id}`);
        return {
            transactionId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret || undefined,
            metadata: {
                publishableKey: this.configService.get('stripe.publicKey'),
            },
        };
    }
    async verifyPayment(reference) {
        const stripe = this.ensureInitialized();
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(reference);
            return {
                success: paymentIntent.status === 'succeeded',
                status: this.mapStatus(paymentIntent.status),
                transactionId: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase(),
                paidAt: paymentIntent.status === 'succeeded'
                    ? new Date(paymentIntent.created * 1000)
                    : undefined,
                customerEmail: paymentIntent.receipt_email || undefined,
                metadata: paymentIntent.metadata,
            };
        }
        catch (error) {
            this.logger.error(`Stripe verify failed: ${error.message}`);
            return {
                success: false,
                status: 'failed',
                transactionId: reference,
                amount: 0,
                currency: '',
                errorMessage: error.message,
            };
        }
    }
    async refundPayment(transactionId, amount, reason) {
        const stripe = this.ensureInitialized();
        try {
            const params = {
                payment_intent: transactionId,
            };
            if (amount) {
                params.amount = Math.round(amount * 100);
            }
            if (reason) {
                params.reason = reason;
            }
            const refund = await stripe.refunds.create(params);
            return {
                success: refund.status === 'succeeded',
                refundId: refund.id,
                amount: refund.amount / 100,
                status: refund.status === 'succeeded' ? 'successful' : 'pending',
                refundedAt: refund.status === 'succeeded'
                    ? new Date(refund.created * 1000)
                    : undefined,
            };
        }
        catch (error) {
            this.logger.error(`Stripe refund failed: ${error.message}`);
            return {
                success: false,
                refundId: '',
                amount: amount || 0,
                status: 'failed',
                errorMessage: error.message,
            };
        }
    }
    async transferToVendor(amount, recipientId, metadata) {
        const stripe = this.ensureInitialized();
        try {
            const transfer = await stripe.transfers.create({
                amount: Math.round(amount * 100),
                currency: this.configService.get('stripe.currency', 'usd'),
                destination: recipientId,
                metadata: metadata || {},
            });
            return {
                success: true,
                transferId: transfer.id,
                amount: transfer.amount / 100,
                recipientId: transfer.destination,
                status: 'successful',
                transferredAt: new Date(transfer.created * 1000),
            };
        }
        catch (error) {
            this.logger.error(`Stripe transfer failed: ${error.message}`);
            return {
                success: false,
                transferId: '',
                amount,
                recipientId,
                status: 'failed',
                errorMessage: error.message,
            };
        }
    }
    verifyWebhookSignature(payload, signature) {
        const stripe = this.ensureInitialized();
        try {
            stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
            return true;
        }
        catch (error) {
            this.logger.error(`Stripe webhook signature invalid: ${error.message}`);
            return false;
        }
    }
    getProviderName() {
        return 'stripe';
    }
    mapStatus(status) {
        switch (status) {
            case 'succeeded':
                return 'successful';
            case 'processing':
            case 'requires_action':
            case 'requires_confirmation':
            case 'requires_payment_method':
                return 'pending';
            default:
                return 'failed';
        }
    }
};
exports.StripePaymentService = StripePaymentService;
exports.StripePaymentService = StripePaymentService = StripePaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripePaymentService);
//# sourceMappingURL=stripe-payment.service.js.map