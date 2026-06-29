import { ConfigService } from '@nestjs/config';
import { IPaymentService, PaymentInitializationResult, PaymentInitializationMetadata, PaymentVerificationResult, RefundResult, TransferResult } from '../interfaces/payment-service.interface';
export declare class PaystackPaymentService implements IPaymentService {
    private readonly configService;
    private readonly logger;
    private client;
    private readonly webhookSecret;
    constructor(configService: ConfigService);
    private ensureInitialized;
    initializePayment(amount: number, currency: string, metadata: PaymentInitializationMetadata): Promise<PaymentInitializationResult>;
    verifyPayment(reference: string): Promise<PaymentVerificationResult>;
    refundPayment(transactionId: string, amount?: number, reason?: string): Promise<RefundResult>;
    transferToVendor(amount: number, recipientId: string, metadata?: Record<string, any>): Promise<TransferResult>;
    verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
    getProviderName(): string;
    private mapStatus;
}
