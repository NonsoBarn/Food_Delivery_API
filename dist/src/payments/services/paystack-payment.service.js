"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PaystackPaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackPaymentService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
let PaystackPaymentService = PaystackPaymentService_1 = class PaystackPaymentService {
    configService;
    logger = new common_1.Logger(PaystackPaymentService_1.name);
    client = null;
    webhookSecret;
    constructor(configService) {
        this.configService = configService;
        const secretKey = this.configService.get('paystack.secretKey');
        this.webhookSecret = this.configService.get('paystack.webhookSecret') || '';
        if (secretKey) {
            this.client = axios_1.default.create({
                baseURL: 'https://api.paystack.co',
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log('Paystack Payment Service initialized');
        }
        else {
            this.logger.warn('Paystack secret key not configured — service will be unavailable');
        }
    }
    ensureInitialized() {
        if (!this.client) {
            throw new Error('Paystack is not configured. Set PAYSTACK_SECRET_KEY in environment.');
        }
        return this.client;
    }
    async initializePayment(amount, currency, metadata) {
        const client = this.ensureInitialized();
        const response = await client.post('/transaction/initialize', {
            email: metadata.customerEmail,
            amount: Math.round(amount * 100),
            currency: currency.toUpperCase(),
            callback_url: metadata.callbackUrl,
            metadata: {
                order_id: metadata.orderId,
                order_group_id: metadata.orderGroupId,
                customer_id: metadata.customerId,
            },
        });
        const data = response.data.data;
        this.logger.log(`Paystack transaction initialized: ${data.reference}`);
        return {
            transactionId: data.reference,
            checkoutUrl: data.authorization_url,
            metadata: {
                accessCode: data.access_code,
            },
        };
    }
    async verifyPayment(reference) {
        const client = this.ensureInitialized();
        try {
            const response = await client.get(`/transaction/verify/${reference}`);
            const data = response.data.data;
            return {
                success: data.status === 'success',
                status: this.mapStatus(data.status),
                transactionId: data.reference,
                amount: data.amount / 100,
                currency: data.currency,
                paidAt: data.status === 'success' ? new Date(data.paid_at) : undefined,
                customerEmail: data.customer?.email,
                metadata: data.metadata,
            };
        }
        catch (error) {
            this.logger.error(`Paystack verify failed: ${error.message}`);
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
            const body = { transaction: transactionId };
            if (amount)
                body.amount = Math.round(amount * 100);
            if (reason)
                body.merchant_note = reason;
            const response = await client.post('/refund', body);
            return {
                success: response.data.status,
                refundId: String(response.data.data.id),
                amount: response.data.data.amount / 100,
                status: 'pending',
            };
        }
        catch (error) {
            this.logger.error(`Paystack refund failed: ${error.message}`);
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
            const response = await client.post('/transfer', {
                source: 'balance',
                amount: Math.round(amount * 100),
                recipient: recipientId,
                reason: metadata?.reason || 'Vendor payout',
            });
            return {
                success: response.data.status,
                transferId: response.data.data.transfer_code,
                amount: response.data.data.amount / 100,
                recipientId,
                status: 'pending',
            };
        }
        catch (error) {
            this.logger.error(`Paystack transfer failed: ${error.message}`);
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
            const hash = crypto
                .createHmac('sha512', this.webhookSecret)
                .update(payload)
                .digest('hex');
            return hash === signature;
        }
        catch (error) {
            this.logger.error(`Paystack webhook signature invalid: ${error.message}`);
            return false;
        }
    }
    getProviderName() {
        return 'paystack';
    }
    mapStatus(status) {
        switch (status) {
            case 'success':
                return 'successful';
            case 'pending':
            case 'ongoing':
                return 'pending';
            default:
                return 'failed';
        }
    }
};
exports.PaystackPaymentService = PaystackPaymentService;
exports.PaystackPaymentService = PaystackPaymentService = PaystackPaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PaystackPaymentService);
//# sourceMappingURL=paystack-payment.service.js.map