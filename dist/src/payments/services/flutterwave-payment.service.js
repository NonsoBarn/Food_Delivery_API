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
var FlutterwavePaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlutterwavePaymentService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let FlutterwavePaymentService = FlutterwavePaymentService_1 = class FlutterwavePaymentService {
    configService;
    logger = new common_1.Logger(FlutterwavePaymentService_1.name);
    client = null;
    webhookSecret;
    constructor(configService) {
        this.configService = configService;
        const secretKey = this.configService.get('flutterwave.secretKey');
        this.webhookSecret =
            this.configService.get('flutterwave.webhookSecret') || '';
        if (secretKey) {
            this.client = axios_1.default.create({
                baseURL: 'https://api.flutterwave.com/v3',
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log('Flutterwave Payment Service initialized');
        }
        else {
            this.logger.warn('Flutterwave secret key not configured — service will be unavailable');
        }
    }
    ensureInitialized() {
        if (!this.client) {
            throw new Error('Flutterwave is not configured. Set FLUTTERWAVE_SECRET_KEY in environment.');
        }
        return this.client;
    }
    async initializePayment(amount, currency, metadata) {
        const client = this.ensureInitialized();
        const txRef = `FLW-${Date.now()}-${metadata.orderId || 'ORDER'}`;
        const response = await client.post('/payments', {
            tx_ref: txRef,
            amount,
            currency: currency.toUpperCase(),
            redirect_url: metadata.callbackUrl,
            customer: {
                email: metadata.customerEmail,
            },
            customizations: {
                title: 'Food Delivery Payment',
                description: `Payment for order ${metadata.orderId || metadata.orderGroupId}`,
            },
            meta: {
                order_id: metadata.orderId,
                order_group_id: metadata.orderGroupId,
                customer_id: metadata.customerId,
            },
        });
        this.logger.log(`Flutterwave payment initialized: ${txRef}`);
        return {
            transactionId: txRef,
            checkoutUrl: response.data.data.link,
        };
    }
    async verifyPayment(reference) {
        const client = this.ensureInitialized();
        try {
            const response = await client.get(`/transactions/verify_by_reference?tx_ref=${reference}`);
            const data = response.data.data;
            return {
                success: data.status === 'successful',
                status: this.mapStatus(data.status),
                transactionId: data.tx_ref,
                amount: data.amount,
                currency: data.currency,
                paidAt: data.status === 'successful' ? new Date(data.created_at) : undefined,
                customerEmail: data.customer?.email,
                metadata: data.meta,
            };
        }
        catch (error) {
            this.logger.error(`Flutterwave verify failed: ${error.message}`);
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
        const client = this.ensureInitialized();
        try {
            const verifyResponse = await client.get(`/transactions/verify_by_reference?tx_ref=${transactionId}`);
            const flwTransactionId = verifyResponse.data.data.id;
            const body = {};
            if (amount)
                body.amount = amount;
            if (reason)
                body.comments = reason;
            const response = await client.post(`/transactions/${flwTransactionId}/refund`, body);
            return {
                success: response.data.status === 'success',
                refundId: String(response.data.data.id),
                amount: response.data.data.amount,
                status: 'pending',
            };
        }
        catch (error) {
            this.logger.error(`Flutterwave refund failed: ${error.message}`);
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
        const client = this.ensureInitialized();
        try {
            const response = await client.post('/transfers', {
                account_bank: metadata?.bankCode || recipientId,
                account_number: metadata?.accountNumber,
                amount,
                currency: this.configService.get('flutterwave.currency', 'NGN'),
                narration: metadata?.reason || 'Vendor payout',
                reference: `TRF-${Date.now()}`,
            });
            return {
                success: response.data.status === 'success',
                transferId: String(response.data.data.id),
                amount: response.data.data.amount,
                recipientId,
                status: 'pending',
            };
        }
        catch (error) {
            this.logger.error(`Flutterwave transfer failed: ${error.message}`);
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
        try {
            return signature === this.webhookSecret;
        }
        catch (error) {
            this.logger.error(`Flutterwave webhook signature invalid: ${error.message}`);
            return false;
        }
    }
    getProviderName() {
        return 'flutterwave';
    }
    mapStatus(status) {
        switch (status) {
            case 'successful':
                return 'successful';
            case 'pending':
                return 'pending';
            default:
                return 'failed';
        }
    }
};
exports.FlutterwavePaymentService = FlutterwavePaymentService;
exports.FlutterwavePaymentService = FlutterwavePaymentService = FlutterwavePaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FlutterwavePaymentService);
//# sourceMappingURL=flutterwave-payment.service.js.map