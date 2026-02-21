import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import type {
  ISmsService,
  SmsOrderData,
  SmsDeliveryData,
} from '../interfaces/sms-service.interface';
import {
  smsOrderConfirmation,
  smsOrderCancelled,
  smsDeliveryAssigned,
  smsDeliveryCompletion,
} from '../templates/sms.templates';

/**
 * Twilio SMS Service
 *
 * Implements ISmsService using the Twilio SDK.
 *
 * KEY LEARNING: How Twilio works
 * ================================
 * 1. You create a Twilio client with your accountSid + authToken.
 * 2. For each SMS, you call client.messages.create({ to, from, body }).
 * 3. Twilio routes the message through the carrier network to the recipient.
 *
 * The Twilio phone number must be a real Twilio number (not your personal number).
 * In sandbox/trial mode, you can only send to verified numbers.
 *
 * Throwing on failure lets BullMQ retry the job automatically.
 */
@Injectable()
export class TwilioSmsService implements ISmsService {
  private readonly logger = new Logger(TwilioSmsService.name);
  private readonly client: ReturnType<typeof twilio>;
  private readonly fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid =
      this.configService.get<string>('twilio.accountSid') ?? '';
    const authToken = this.configService.get<string>('twilio.authToken') ?? '';

    // Create the Twilio REST client once; reused for all SMS sends
    this.client = twilio(accountSid, authToken);

    this.fromNumber =
      this.configService.get<string>('twilio.phoneNumber') ?? '';
  }

  async sendOrderConfirmation(data: SmsOrderData): Promise<void> {
    await this.sendSms(
      data.to,
      smsOrderConfirmation(data.orderNumber, data.vendorName),
    );
  }

  async sendOrderCancelled(data: SmsOrderData): Promise<void> {
    await this.sendSms(data.to, smsOrderCancelled(data.orderNumber));
  }

  async sendDeliveryAssigned(data: SmsDeliveryData): Promise<void> {
    await this.sendSms(
      data.to,
      smsDeliveryAssigned(data.orderNumber, data.riderName),
    );
  }

  async sendDeliveryCompletion(data: SmsDeliveryData): Promise<void> {
    await this.sendSms(data.to, smsDeliveryCompletion(data.orderNumber));
  }

  getProviderName(): string {
    return 'twilio';
  }

  private async sendSms(to: string, body: string): Promise<void> {
    try {
      const message = await this.client.messages.create({
        to,
        from: this.fromNumber,
        body,
      });

      this.logger.log(
        `SMS sent via Twilio | SID: ${message.sid} | To: ${to}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Twilio failed to send SMS to ${to}: ${message}`);
      throw error; // Let BullMQ retry
    }
  }
}
