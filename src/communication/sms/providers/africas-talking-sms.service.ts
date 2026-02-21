import { Injectable } from '@nestjs/common';
import type {
  ISmsService,
  SmsOrderData,
  SmsDeliveryData,
} from '../interfaces/sms-service.interface';

/**
 * Africa's Talking SMS Service — STUB
 *
 * Africa's Talking (africastalking.com) is a popular SMS/USSD/Voice provider
 * across African markets, particularly Nigeria, Kenya, Ghana, Uganda, etc.
 * It offers competitive per-SMS pricing on local routes.
 *
 * To implement:
 *   yarn add africastalking
 *   const AT = require('africastalking')({ username, apiKey });
 *   const sms = AT.SMS;
 *   await sms.send({ to: ['+2348012345678'], message: 'Hello', from: 'FoodApp' });
 *
 * Same as the Nodemailer stub — fails loudly if accidentally selected.
 */
@Injectable()
export class AfricasTalkingSmsService implements ISmsService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendOrderConfirmation(_data: SmsOrderData): Promise<void> {
    throw new Error(
      "Africa's Talking SMS is not yet configured. Set DEFAULT_SMS_PROVIDER=twilio or implement the AT SDK.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendOrderCancelled(_data: SmsOrderData): Promise<void> {
    throw new Error("Africa's Talking SMS is not yet configured.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendDeliveryAssigned(_data: SmsDeliveryData): Promise<void> {
    throw new Error("Africa's Talking SMS is not yet configured.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendDeliveryCompletion(_data: SmsDeliveryData): Promise<void> {
    throw new Error("Africa's Talking SMS is not yet configured.");
  }

  getProviderName(): string {
    return 'africas_talking';
  }
}
