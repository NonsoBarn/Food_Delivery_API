import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { PaymentFactoryService } from './payment-factory.service';
export declare class PaymentsWebhookController {
    private readonly paymentsService;
    private readonly paymentFactory;
    private readonly logger;
    constructor(paymentsService: PaymentsService, paymentFactory: PaymentFactoryService);
    handleStripeWebhook(req: RawBodyRequest<Request>, signature: string): Promise<{
        received: boolean;
    }>;
    handlePaystackWebhook(req: RawBodyRequest<Request>, signature: string): Promise<{
        received: boolean;
    }>;
    handleFlutterwaveWebhook(req: RawBodyRequest<Request>, signature: string): Promise<{
        received: boolean;
    }>;
}
