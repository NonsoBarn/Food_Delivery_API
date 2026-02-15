import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import {
  IPaymentService,
  PaymentInitializationResult,
  PaymentInitializationMetadata,
  PaymentVerificationResult,
  RefundResult,
  TransferResult,
} from '../interfaces/payment-service.interface';

@Injectable()
export class PaystackPaymentService implements IPaymentService {
  private readonly logger = new Logger(PaystackPaymentService.name);
  private client: AxiosInstance | null = null;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('paystack.secretKey');
    this.webhookSecret = this.configService.get<string>('paystack.webhookSecret') || '';

    if (secretKey) {
      this.client = axios.create({
        baseURL: 'https://api.paystack.co',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log('Paystack Payment Service initialized');
    } else {
      this.logger.warn('Paystack secret key not configured — service will be unavailable');
    }
  }

  private ensureInitialized(): AxiosInstance {
    if (!this.client) {
      throw new Error('Paystack is not configured. Set PAYSTACK_SECRET_KEY in environment.');
    }
    return this.client;
  }

  async initializePayment(
    amount: number,
    currency: string,
    metadata: PaymentInitializationMetadata,
  ): Promise<PaymentInitializationResult> {
    const client = this.ensureInitialized();

    const response = await client.post('/transaction/initialize', {
      email: metadata.customerEmail,
      amount: Math.round(amount * 100), // Paystack uses kobo (NGN) / cents
      currency: currency.toUpperCase(),
      callback_url: metadata.callbackUrl,
      metadata: {
        order_id: metadata.orderId,
        order_group_id: metadata.orderGroupId,
        customer_id: metadata.customerId,
      },
    });

    const data = response.data.data;
    this.logger.log(`Paystack transaction initialized: ${data.reference}`);

    return {
      transactionId: data.reference,
      checkoutUrl: data.authorization_url,
      metadata: {
        accessCode: data.access_code,
      },
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    const client = this.ensureInitialized();

    try {
      const response = await client.get(`/transaction/verify/${reference}`);
      const data = response.data.data;

      return {
        success: data.status === 'success',
        status: this.mapStatus(data.status),
        transactionId: data.reference,
        amount: data.amount / 100,
        currency: data.currency,
        paidAt: data.status === 'success' ? new Date(data.paid_at) : undefined,
        customerEmail: data.customer?.email,
        metadata: data.metadata,
      };
    } catch (error) {
      this.logger.error(`Paystack verify failed: ${error.message}`);
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
    const client = this.ensureInitialized();

    try {
      const body: Record<string, any> = { transaction: transactionId };
      if (amount) body.amount = Math.round(amount * 100);
      if (reason) body.merchant_note = reason;

      const response = await client.post('/refund', body);

      return {
        success: response.data.status,
        refundId: String(response.data.data.id),
        amount: response.data.data.amount / 100,
        status: 'pending', // Paystack refunds are processed asynchronously
      };
    } catch (error) {
      this.logger.error(`Paystack refund failed: ${error.message}`);
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
    const client = this.ensureInitialized();

    try {
      const response = await client.post('/transfer', {
        source: 'balance',
        amount: Math.round(amount * 100),
        recipient: recipientId, // Paystack transfer recipient code
        reason: metadata?.reason || 'Vendor payout',
      });

      return {
        success: response.data.status,
        transferId: response.data.data.transfer_code,
        amount: response.data.data.amount / 100,
        recipientId,
        status: 'pending', // Paystack transfers are asynchronous
      };
    } catch (error) {
      this.logger.error(`Paystack transfer failed: ${error.message}`);
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
    try {
      const hash = crypto
        .createHmac('sha512', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return hash === signature;
    } catch (error) {
      this.logger.error(`Paystack webhook signature invalid: ${error.message}`);
      return false;
    }
  }

  getProviderName(): string {
    return 'paystack';
  }

  private mapStatus(status: string): 'pending' | 'successful' | 'failed' {
    switch (status) {
      case 'success':
        return 'successful';
      case 'pending':
      case 'ongoing':
        return 'pending';
      default:
        return 'failed';
    }
  }
}
