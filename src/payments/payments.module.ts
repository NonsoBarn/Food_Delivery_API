import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Payment } from './entities/payment.entity';
import { PaymentLog } from './entities/payment-log.entity';
import { PaymentProviderConfig } from './entities/payment-provider-config.entity';
import { Order } from '../orders/entities/order.entity';

// Controllers
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';

// Services
import { PaymentsService } from './payments.service';
import { PaymentFactoryService } from './payment-factory.service';
import { StripePaymentService } from './services/stripe-payment.service';
import { PaystackPaymentService } from './services/paystack-payment.service';
import { FlutterwavePaymentService } from './services/flutterwave-payment.service';

// Configs
import stripeConfig from './config/stripe.config';
import paystackConfig from './config/paystack.config';
import flutterwaveConfig from './config/flutterwave.config';
import paymentConfig from './config/payment.config';

@Module({
  imports: [
    ConfigModule.forFeature(stripeConfig),
    ConfigModule.forFeature(paystackConfig),
    ConfigModule.forFeature(flutterwaveConfig),
    ConfigModule.forFeature(paymentConfig),

    TypeOrmModule.forFeature([
      Payment,
      PaymentLog,
      PaymentProviderConfig,
      Order,
    ]),
  ],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [
    PaymentsService,
    PaymentFactoryService,
    StripePaymentService,
    PaystackPaymentService,
    FlutterwavePaymentService,
  ],
  exports: [
    PaymentsService,
    PaymentFactoryService,
    StripePaymentService,
    PaystackPaymentService,
    FlutterwavePaymentService,
  ],
})
export class PaymentsModule {}
