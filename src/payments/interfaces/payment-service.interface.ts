/**
 * Payment Service Interface
 *
 * All payment providers (Stripe, Paystack, Flutterwave) must implement this contract.
 * Pattern mirrors IStorageService from src/storage/interfaces/storage-service.interface.ts
 */

export interface PaymentInitializationResult {
  /** Provider's transaction reference */
  transactionId: string;
  /** Redirect URL for hosted checkout (Paystack, Flutterwave) */
  checkoutUrl?: string;
  /** Client secret for client-side confirmation (Stripe) */
  clientSecret?: string;
  /** Additional provider-specific data */
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
  /** Initialize a payment transaction */
  initializePayment(
    amount: number,
    currency: string,
    metadata: PaymentInitializationMetadata,
  ): Promise<PaymentInitializationResult>;

  /** Verify a payment transaction status with the provider */
  verifyPayment(reference: string): Promise<PaymentVerificationResult>;

  /** Refund a payment (full or partial) */
  refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundResult>;

  /** Transfer funds to a vendor/recipient */
  transferToVendor(
    amount: number,
    recipientId: string,
    metadata?: Record<string, any>,
  ): Promise<TransferResult>;

  /** Verify webhook signature from the provider */
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;

  /** Get provider name identifier */
  getProviderName(): string;
}
