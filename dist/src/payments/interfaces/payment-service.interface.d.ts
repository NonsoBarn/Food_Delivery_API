export interface PaymentInitializationResult {
    transactionId: string;
    checkoutUrl?: string;
    clientSecret?: string;
    metadata?: Record<string, any>;
}
export interface PaymentVerificationResult {
    success: boolean;
    status: 'pending' | 'successful' | 'failed';
    transactionId: string;
    amount: number;
    currency: string;
    paidAt?: Date;
    customerEmail?: string;
    metadata?: Record<string, any>;
    errorMessage?: string;
}
export interface RefundResult {
    success: boolean;
    refundId: string;
    amount: number;
    status: 'pending' | 'successful' | 'failed';
    refundedAt?: Date;
    errorMessage?: string;
}
export interface TransferResult {
    success: boolean;
    transferId: string;
    amount: number;
    recipientId: string;
    status: 'pending' | 'successful' | 'failed';
    transferredAt?: Date;
    errorMessage?: string;
}
export interface PaymentInitializationMetadata {
    customerEmail: string;
    orderId?: string;
    orderGroupId?: string;
    customerId?: string;
    callbackUrl?: string;
    [key: string]: any;
}
export interface IPaymentService {
    initializePayment(amount: number, currency: string, metadata: PaymentInitializationMetadata): Promise<PaymentInitializationResult>;
    verifyPayment(reference: string): Promise<PaymentVerificationResult>;
    refundPayment(transactionId: string, amount?: number, reason?: string): Promise<RefundResult>;
    transferToVendor(amount: number, recipientId: string, metadata?: Record<string, any>): Promise<TransferResult>;
    verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
    getProviderName(): string;
}
