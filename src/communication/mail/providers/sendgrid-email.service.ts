import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
/**
 * KEY LEARNING: CommonJS default import with esModuleInterop
 * ===========================================================
 * @sendgrid/mail is a CommonJS module that exports a singleton object as
 * module.exports = { setApiKey, send, ... }.
 *
 * `import * as sgMail` gives you the MODULE NAMESPACE (an object with a
 * `default` property), NOT the exported singleton — so sgMail.setApiKey
 * would be undefined.
 *
 * `import sgMail from '...'` with esModuleInterop=true correctly unwraps
 * the CommonJS default export and gives you the singleton directly.
 * Always use this pattern for CommonJS packages that export a single object.
 */
import sgMail from '@sendgrid/mail';
import type {
  IEmailService,
  OrderEmailData,
  StatusEmailData,
  DeliveryEmailData,
} from '../interfaces/email-service.interface';
import {
  welcomeEmailHtml,
  welcomeEmailSubject,
} from '../templates/welcome.template';
import {
  orderConfirmationHtml,
  orderConfirmationSubject,
} from '../templates/order-confirmation.template';
import {
  orderStatusUpdateHtml,
  orderStatusUpdateSubject,
} from '../templates/order-status-update.template';
import {
  deliveryCompletionHtml,
  deliveryCompletionSubject,
} from '../templates/delivery-completion.template';

/**
 * SendGrid Email Service
 *
 * Implements IEmailService using the @sendgrid/mail SDK.
 *
 * KEY LEARNING: How @sendgrid/mail works
 * ========================================
 * 1. You call sgMail.setApiKey() once at startup with your API key.
 * 2. For each email, you call sgMail.send({ to, from, subject, html }).
 * 3. SendGrid's servers handle delivery, retries, bounce tracking, etc.
 *
 * The SDK makes an HTTP POST to https://api.sendgrid.com/v3/mail/send.
 * That HTTP call is what takes time — this is why we queue emails via BullMQ
 * instead of calling this directly in the HTTP request handler.
 *
 * KEY LEARNING: private helper method sendEmail()
 * ================================================
 * All four public methods (sendWelcome, sendOrderConfirmation, etc.) share
 * the same send logic. We extract that to a private helper to avoid
 * repeating the try/catch and logging in each method.
 * This is the DRY principle (Don't Repeat Yourself).
 */
@Injectable()
export class SendGridEmailService implements IEmailService {
  private readonly logger = new Logger(SendGridEmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    // Set the API key once — all subsequent sgMail.send() calls use it
    const apiKey = this.configService.get<string>('sendgrid.apiKey') ?? '';
    sgMail.setApiKey(apiKey);

    this.fromEmail =
      this.configService.get<string>('sendgrid.fromEmail') ?? '';
    this.fromName =
      this.configService.get<string>('sendgrid.fromName') ??
      'Food Delivery App';
  }

  async sendWelcome(to: string, role: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: welcomeEmailSubject(),
      html: welcomeEmailHtml(to, role),
    });
  }

  async sendOrderConfirmation(data: OrderEmailData): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: orderConfirmationSubject(data.orderNumber),
      html: orderConfirmationHtml(data),
    });
  }

  async sendOrderStatusUpdate(data: StatusEmailData): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: orderStatusUpdateSubject(data.orderNumber, data.newStatus),
      html: orderStatusUpdateHtml(data),
    });
  }

  async sendDeliveryCompletion(data: DeliveryEmailData): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: deliveryCompletionSubject(data.orderNumber),
      html: deliveryCompletionHtml(data),
    });
  }

  getProviderName(): string {
    return 'sendgrid';
  }

  /**
   * Private helper — sends via SendGrid SDK.
   *
   * Throwing here is intentional: BullMQ catches the error and retries
   * the job up to the configured max attempts. The error is also logged
   * so you can see WHY it failed (invalid API key, bad email address, etc.)
   */
  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      await sgMail.send({
        to: params.to,
        from: { email: this.fromEmail, name: this.fromName },
        subject: params.subject,
        html: params.html,
      });

      this.logger.log(`Email sent via SendGrid to: ${params.to} | Subject: ${params.subject}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SendGrid failed to send to ${params.to}: ${message}`);
      // Re-throw so BullMQ retries the job
      throw error;
    }
  }
}
