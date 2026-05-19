/**
 * Payments Webhook Controller
 *
 * PUBLIC endpoints — no auth guards. Payment providers (Stripe, Paystack,
 * Flutterwave) call these when payment events occur (success, failure, refund).
 *
 * Security is provided by webhook signature verification, not JWT tokens.
 * Each provider has its own endpoint with provider-specific signature headers.
 *
 * Routes: /api/v1/webhooks/payments
 */
import {
  Controller,
  Post,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { PaymentFactoryService } from './payment-factory.service';
import { PaymentProvider } from './enums/payment-provider.enum';

type WebhookEvent = Record<string, unknown>;

@ApiTags('Webhooks')
@Controller({
  path: 'webhooks/payments',
  version: '1',
})
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentFactory: PaymentFactoryService,
  ) {}

  /**
   * Stripe webhook
   *
   * POST /api/v1/webhooks/payments/stripe
   * Header: stripe-signature
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook (public — signature-verified)', description: 'Called by Stripe. Do not call manually.' })
  @ApiHeader({ name: 'stripe-signature', required: true })
  @ApiResponse({ status: 200, description: '{ received: true }' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    const paymentService = this.paymentFactory.getPaymentService(
      PaymentProvider.STRIPE,
    );

    if (!paymentService.verifyWebhookSignature(rawBody, signature)) {
      this.logger.error('Invalid Stripe webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString()) as WebhookEvent;
    await this.paymentsService.processWebhookEvent(
      PaymentProvider.STRIPE,
      event,
    );

    return { received: true };
  }

  /**
   * Paystack webhook
   *
   * POST /api/v1/webhooks/payments/paystack
   * Header: x-paystack-signature
   */
  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook (public — signature-verified)', description: 'Called by Paystack. Do not call manually.' })
  @ApiHeader({ name: 'x-paystack-signature', required: true })
  @ApiResponse({ status: 200, description: '{ received: true }' })
  async handlePaystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing x-paystack-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    const paymentService = this.paymentFactory.getPaymentService(
      PaymentProvider.PAYSTACK,
    );

    if (!paymentService.verifyWebhookSignature(rawBody, signature)) {
      this.logger.error('Invalid Paystack webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString()) as WebhookEvent;
    await this.paymentsService.processWebhookEvent(
      PaymentProvider.PAYSTACK,
      event,
    );

    return { received: true };
  }

  /**
   * Flutterwave webhook
   *
   * POST /api/v1/webhooks/payments/flutterwave
   * Header: verif-hash
   */
  @Post('flutterwave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flutterwave webhook (public — signature-verified)', description: 'Called by Flutterwave. Do not call manually.' })
  @ApiHeader({ name: 'verif-hash', required: true })
  @ApiResponse({ status: 200, description: '{ received: true }' })
  async handleFlutterwaveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('verif-hash') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing verif-hash header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    const paymentService = this.paymentFactory.getPaymentService(
      PaymentProvider.FLUTTERWAVE,
    );

    if (!paymentService.verifyWebhookSignature(rawBody, signature)) {
      this.logger.error('Invalid Flutterwave webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString()) as WebhookEvent;
    await this.paymentsService.processWebhookEvent(
      PaymentProvider.FLUTTERWAVE,
      event,
    );

    return { received: true };
  }
}
