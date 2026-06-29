"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const payment_entity_1 = require("./entities/payment.entity");
const payment_log_entity_1 = require("./entities/payment-log.entity");
const payment_provider_config_entity_1 = require("./entities/payment-provider-config.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const payments_controller_1 = require("./payments.controller");
const payments_webhook_controller_1 = require("./payments-webhook.controller");
const payments_service_1 = require("./payments.service");
const payment_factory_service_1 = require("./payment-factory.service");
const stripe_payment_service_1 = require("./services/stripe-payment.service");
const paystack_payment_service_1 = require("./services/paystack-payment.service");
const flutterwave_payment_service_1 = require("./services/flutterwave-payment.service");
const stripe_config_1 = __importDefault(require("./config/stripe.config"));
const paystack_config_1 = __importDefault(require("./config/paystack.config"));
const flutterwave_config_1 = __importDefault(require("./config/flutterwave.config"));
const payment_config_1 = __importDefault(require("./config/payment.config"));
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forFeature(stripe_config_1.default),
            config_1.ConfigModule.forFeature(paystack_config_1.default),
            config_1.ConfigModule.forFeature(flutterwave_config_1.default),
            config_1.ConfigModule.forFeature(payment_config_1.default),
            typeorm_1.TypeOrmModule.forFeature([
                payment_entity_1.Payment,
                payment_log_entity_1.PaymentLog,
                payment_provider_config_entity_1.PaymentProviderConfig,
                order_entity_1.Order,
            ]),
        ],
        controllers: [payments_controller_1.PaymentsController, payments_webhook_controller_1.PaymentsWebhookController],
        providers: [
            payments_service_1.PaymentsService,
            payment_factory_service_1.PaymentFactoryService,
            stripe_payment_service_1.StripePaymentService,
            paystack_payment_service_1.PaystackPaymentService,
            flutterwave_payment_service_1.FlutterwavePaymentService,
        ],
        exports: [
            payments_service_1.PaymentsService,
            payment_factory_service_1.PaymentFactoryService,
            stripe_payment_service_1.StripePaymentService,
            paystack_payment_service_1.PaystackPaymentService,
            flutterwave_payment_service_1.FlutterwavePaymentService,
        ],
    })
], PaymentsModule);
//# sourceMappingURL=payments.module.js.map