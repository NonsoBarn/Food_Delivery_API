import { Injectable } from '@nestjs/common';
import type {
  IEmailService,
  OrderEmailData,
  StatusEmailData,
  DeliveryEmailData,
} from '../interfaces/email-service.interface';

/**
 * Nodemailer Email Service — STUB
 *
 * KEY LEARNING: What is a stub?
 * ===============================
 * A stub is a placeholder that implements an interface but doesn't do real work.
 * It throws an error to make it obvious when someone accidentally selects
 * this provider without configuring it.
 *
 * Why include it at all?
 * 1. It shows the team HOW to add a real provider later (implement the interface)
 * 2. The factory won't crash if Nodemailer is selected — it fails loudly instead of silently
 * 3. It acts as living documentation: "Nodemailer is a supported future option"
 *
 * To make this real: install nodemailer, create an SMTP transporter,
 * and replace each throw with a real transporter.sendMail() call.
 */
@Injectable()
export class NodemailerEmailService implements IEmailService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendWelcome(_to: string, _role: string): Promise<void> {
    throw new Error(
      'NodemailerEmailService is not yet configured. Set DEFAULT_EMAIL_PROVIDER=sendgrid or implement SMTP config.',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendOrderConfirmation(_data: OrderEmailData): Promise<void> {
    throw new Error('NodemailerEmailService is not yet configured.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendOrderStatusUpdate(_data: StatusEmailData): Promise<void> {
    throw new Error('NodemailerEmailService is not yet configured.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendDeliveryCompletion(_data: DeliveryEmailData): Promise<void> {
    throw new Error('NodemailerEmailService is not yet configured.');
  }

  getProviderName(): string {
    return 'nodemailer';
  }
}
