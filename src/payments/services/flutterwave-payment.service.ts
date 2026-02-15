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
export class FlutterwavePaymentService implements IPaymentService {
  private readonly logger = new Logger(FlutterwavePaymentService.name);
  private client: AxiosInstance | null = null;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('flutterwave.secretKey');
    this.webhookSecret =
      this.configService.get<string>('flutterwave.webhookSecret') || '';

    if (secretKey) {
      this.client = axios.create({
        baseURL: 'https://api.flutterwave.com/v3',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log('Flutterwave Payment Service initialized');
    } else {
      this.logger.warn(
        'Flutterwave secret key not configured — service will be unavailable',
      );
    }
  }

  private ensureInitialized(): AxiosInstance {
    if (!this.client) {
      throw new Error(
        'Flutterwave is not configured. Set FLUTTERWAVE_SECRET_KEY in environment.',
      );
    }
    return this.client;
  }

  async initializePayment(
    amount: number,
    currency: string,
    metadata: PaymentInitializationMetadata,
  ): Promise<PaymentInitializationResult> {
    const client = this.ensureInitialized();

    const txRef = `FLW-${Date.now()}-${metadata.orderId || 'ORDER'}`;

    const response = await client.post('/payments', {
      tx_ref: txRef,
      amount,
      currency: currency.toUpperCase(),
      redirect_url: metadata.callbackUrl,
      customer: {
        email: metadata.customerEmail,
      },
      customizations: {
        title: 'Food Delivery Payment',
        description: `Payment for order ${metadata.orderId || metadata.orderGroupId}`,
      },
      meta: {
        order_id: metadata.orderId,
        order_group_id: metadata.orderGroupId,
        customer_id: metadata.customerId,
      },
    });

    this.logger.log(`Flutterwave payment initialized: ${txRef}`);

    return {
      transactionId: txRef,
      checkoutUrl: response.data.data.link,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    const client = this.ensureInitialized();

    try {
      const response = await client.get(
        `/transactions/verify_by_reference?tx_ref=${reference}`,
      );
      const data = response.data.data;

      return {
        success: data.status === 'successful',
        status: this.mapStatus(data.status),
        transactionId: data.tx_ref,
        amount: data.amount,
        currency: data.currency,
        paidAt:
          data.status === 'successful' ? new Date(data.created_at) : undefined,
        customerEmail: data.customer?.email,
        metadata: data.meta,
      };
    } catch (error) {
      this.logger.error(`Flutterwave verify failed: ${error.message}`);
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
      // Flutterwave needs numeric transaction ID, not tx_ref — look it up first
      const verifyResponse = await client.get(
        `/transactions/verify_by_reference?tx_ref=${transactionId}`,
      );
      const flwTransactionId = verifyResponse.data.data.id;

      const body: Record<string, any> = {};
      if (amount) body.amount = amount;
      if (reason) body.comments = reason;

      const response = await client.post(
        `/transactions/${flwTransactionId}/refund`,
        body,
      );

      return {
        success: response.data.status === 'success',
        refundId: String(response.data.data.id),
        amount: response.data.data.amount,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error(`Flutterwave refund failed: ${error.message}`);
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
      const response = await client.post('/transfers', {
        account_bank: metadata?.bankCode || recipientId,
        account_number: metadata?.accountNumber,
        amount,
        currency: this.configService.get<string>('flutterwave.currency', 'NGN'),
        narration: metadata?.reason || 'Vendor payout',
        reference: `TRF-${Date.now()}`,
      });

      return {
        success: response.data.status === 'success',
        transferId: String(response.data.data.id),
        amount: response.data.data.amount,
        recipientId,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error(`Flutterwave transfer failed: ${error.message}`);
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
      // Flutterwave sends a verif-hash header that must match your webhook secret
      return signature === this.webhookSecret;
    } catch (error) {
      this.logger.error(
        `Flutterwave webhook signature invalid: ${error.message}`,
      );
      return false;
    }
  }

  getProviderName(): string {
    return 'flutterwave';
  }

  private mapStatus(status: string): 'pending' | 'successful' | 'failed' {
    switch (status) {
      case 'successful':
        return 'successful';
      case 'pending':
        return 'pending';
      default:
        return 'failed';
    }
  }
}
