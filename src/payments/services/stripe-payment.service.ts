import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  IPaymentService,
  PaymentInitializationResult,
  PaymentInitializationMetadata,
  PaymentVerificationResult,
  RefundResult,
  TransferResult,
} from '../interfaces/payment-service.interface';

@Injectable()
export class StripePaymentService implements IPaymentService {
  private readonly logger = new Logger(StripePaymentService.name);
  private stripe: Stripe | null = null;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    this.webhookSecret = this.configService.get<string>('stripe.webhookSecret') || '';

    if (secretKey) {
      this.stripe = new Stripe(secretKey);
      this.logger.log('Stripe Payment Service initialized');
    } else {
      this.logger.warn('Stripe secret key not configured — service will be unavailable');
    }
  }

  private ensureInitialized(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in environment.');
    }
    return this.stripe;
  }

  async initializePayment(
    amount: number,
    currency: string,
    metadata: PaymentInitializationMetadata,
  ): Promise<PaymentInitializationResult> {
    const stripe = this.ensureInitialized();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses smallest currency unit (cents)
      currency: currency.toLowerCase(),
      metadata: {
        orderId: metadata.orderId || '',
        orderGroupId: metadata.orderGroupId || '',
        customerId: metadata.customerId || '',
      },
      receipt_email: metadata.customerEmail,
    });

    this.logger.log(`Stripe PaymentIntent created: ${paymentIntent.id}`);

    return {
      transactionId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
      metadata: {
        publishableKey: this.configService.get<string>('stripe.publicKey'),
      },
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    const stripe = this.ensureInitialized();

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(reference);

      return {
        success: paymentIntent.status === 'succeeded',
        status: this.mapStatus(paymentIntent.status),
        transactionId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        paidAt:
          paymentIntent.status === 'succeeded'
            ? new Date(paymentIntent.created * 1000)
            : undefined,
        customerEmail: paymentIntent.receipt_email || undefined,
        metadata: paymentIntent.metadata as Record<string, any>,
      };
    } catch (error) {
      this.logger.error(`Stripe verify failed: ${error.message}`);
      return {
        success: false,
        status: 'failed',
        transactionId: reference,
        amount: 0,
        currency: '',
        errorMessage: error.message,
      };
    }
  }

  async refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundResult> {
    const stripe = this.ensureInitialized();

    try {
      const params: Stripe.RefundCreateParams = {
        payment_intent: transactionId,
      };
      if (amount) {
        params.amount = Math.round(amount * 100);
      }
      if (reason) {
        params.reason = reason as Stripe.RefundCreateParams.Reason;
      }

      const refund = await stripe.refunds.create(params);

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status === 'succeeded' ? 'successful' : 'pending',
        refundedAt:
          refund.status === 'succeeded'
            ? new Date(refund.created * 1000)
            : undefined,
      };
    } catch (error) {
      this.logger.error(`Stripe refund failed: ${error.message}`);
      return {
        success: false,
        refundId: '',
        amount: amount || 0,
        status: 'failed',
        errorMessage: error.message,
      };
    }
  }

  async transferToVendor(
    amount: number,
    recipientId: string,
    metadata?: Record<string, any>,
  ): Promise<TransferResult> {
    const stripe = this.ensureInitialized();

    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: this.configService.get<string>('stripe.currency', 'usd'),
        destination: recipientId, // Stripe Connected Account ID
        metadata: metadata || {},
      });

      return {
        success: true,
        transferId: transfer.id,
        amount: transfer.amount / 100,
        recipientId: transfer.destination as string,
        status: 'successful',
        transferredAt: new Date(transfer.created * 1000),
      };
    } catch (error) {
      this.logger.error(`Stripe transfer failed: ${error.message}`);
      return {
        success: false,
        transferId: '',
        amount,
        recipientId,
        status: 'failed',
        errorMessage: error.message,
      };
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    const stripe = this.ensureInitialized();

    try {
      stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch (error) {
      this.logger.error(`Stripe webhook signature invalid: ${error.message}`);
      return false;
    }
  }

  getProviderName(): string {
    return 'stripe';
  }

  private mapStatus(
    status: Stripe.PaymentIntent.Status,
  ): 'pending' | 'successful' | 'failed' {
    switch (status) {
      case 'succeeded':
        return 'successful';
      case 'processing':
      case 'requires_action':
      case 'requires_confirmation':
      case 'requires_payment_method':
        return 'pending';
      default:
        return 'failed';
    }
  }
}
