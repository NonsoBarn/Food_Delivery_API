import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPaymentService } from './interfaces/payment-service.interface';
import { StripePaymentService } from './services/stripe-payment.service';
import { PaystackPaymentService } from './services/paystack-payment.service';
import { FlutterwavePaymentService } from './services/flutterwave-payment.service';
import { PaymentProvider } from './enums/payment-provider.enum';

/**
 * Payment Factory Service
 *
 * Routes payment operations to the appropriate provider.
 * Pattern mirrors StorageFactoryService (src/storage/storage-factory.service.ts).
 */
@Injectable()
export class PaymentFactoryService {
  constructor(
    private readonly configService: ConfigService,
    private readonly stripePaymentService: StripePaymentService,
    private readonly paystackPaymentService: PaystackPaymentService,
    private readonly flutterwavePaymentService: FlutterwavePaymentService,
  ) {}

  /**
   * Get payment service by provider enum
   */
  getPaymentService(provider: PaymentProvider): IPaymentService {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return this.stripePaymentService;

      case PaymentProvider.PAYSTACK:
        return this.paystackPaymentService;

      case PaymentProvider.FLUTTERWAVE:
        return this.flutterwavePaymentService;

      default:
        return this.getDefaultService();
    }
  }

  /**
   * Get payment service by provider name string
   */
  getServiceByProvider(provider: string): IPaymentService {
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

  /**
   * Get the default payment service based on environment config
   */
  private getDefaultService(): IPaymentService {
    const provider = this.configService.get<string>(
      'payment.defaultProvider',
      'stripe',
    );

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

  /**
   * Get all available payment services (useful for health checks)
   */
  getAllServices(): Record<string, IPaymentService> {
    return {
      stripe: this.stripePaymentService,
      paystack: this.paystackPaymentService,
      flutterwave: this.flutterwavePaymentService,
    };
  }
}
