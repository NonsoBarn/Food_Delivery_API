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
exports.PaymentFactoryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_payment_service_1 = require("./services/stripe-payment.service");
const paystack_payment_service_1 = require("./services/paystack-payment.service");
const flutterwave_payment_service_1 = require("./services/flutterwave-payment.service");
const payment_provider_enum_1 = require("./enums/payment-provider.enum");
let PaymentFactoryService = class PaymentFactoryService {
    configService;
    stripePaymentService;
    paystackPaymentService;
    flutterwavePaymentService;
    constructor(configService, stripePaymentService, paystackPaymentService, flutterwavePaymentService) {
        this.configService = configService;
        this.stripePaymentService = stripePaymentService;
        this.paystackPaymentService = paystackPaymentService;
        this.flutterwavePaymentService = flutterwavePaymentService;
    }
    getPaymentService(provider) {
        switch (provider) {
            case payment_provider_enum_1.PaymentProvider.STRIPE:
                return this.stripePaymentService;
            case payment_provider_enum_1.PaymentProvider.PAYSTACK:
                return this.paystackPaymentService;
            case payment_provider_enum_1.PaymentProvider.FLUTTERWAVE:
                return this.flutterwavePaymentService;
            default:
                return this.getDefaultService();
        }
    }
    getServiceByProvider(provider) {
        switch (provider.toLowerCase()) {
            case 'stripe':
                return this.stripePaymentService;
            case 'paystack':
                return this.paystackPaymentService;
            case 'flutterwave':
                return this.flutterwavePaymentService;
            default:
                return this.getDefaultService();
        }
    }
    getDefaultService() {
        const provider = this.configService.get('payment.defaultProvider', 'stripe');
        switch (provider.toLowerCase()) {
            case 'stripe':
                return this.stripePaymentService;
            case 'paystack':
                return this.paystackPaymentService;
            case 'flutterwave':
                return this.flutterwavePaymentService;
            default:
                return this.stripePaymentService;
        }
    }
    getAllServices() {
        return {
            stripe: this.stripePaymentService,
            paystack: this.paystackPaymentService,
            flutterwave: this.flutterwavePaymentService,
        };
    }
};
exports.PaymentFactoryService = PaymentFactoryService;
exports.PaymentFactoryService = PaymentFactoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        stripe_payment_service_1.StripePaymentService,
        paystack_payment_service_1.PaystackPaymentService,
        flutterwave_payment_service_1.FlutterwavePaymentService])
], PaymentFactoryService);
//# sourceMappingURL=payment-factory.service.js.map