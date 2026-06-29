import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentEventType } from '../enums/payment-event-type.enum';
export declare class PaymentLog {
    id: string;
    paymentId: string | null;
    provider: PaymentProvider;
    eventType: PaymentEventType;
    providerEventId: string | null;
    payload: Record<string, any>;
    processed: boolean;
    processedAt: Date;
    processingError: string;
    signatureVerified: boolean;
    createdAt: Date;
}
