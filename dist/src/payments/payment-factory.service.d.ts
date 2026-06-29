import { ConfigService } from '@nestjs/config';
import { IPaymentService } from './interfaces/payment-service.interface';
import { StripePaymentService } from './services/stripe-payment.service';
import { PaystackPaymentService } from './services/paystack-payment.service';
import { FlutterwavePaymentService } from './services/flutterwave-payment.service';
import { PaymentProvider } from './enums/payment-provider.enum';
export declare class PaymentFactoryService {
    private readonly configService;
    private readonly stripePaymentService;
    private readonly paystackPaymentService;
    private readonly flutterwavePaymentService;
    constructor(configService: ConfigService, stripePaymentService: StripePaymentService, paystackPaymentService: PaystackPaymentService, flutterwavePaymentService: FlutterwavePaymentService);
    getPaymentService(provider: PaymentProvider): IPaymentService;
    getServiceByProvider(provider: string): IPaymentService;
    private getDefaultService;
    getAllServices(): Record<string, IPaymentService>;
}
