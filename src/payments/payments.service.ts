import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentTransactionType } from './entities/payment.entity';
import { PaymentLog } from './entities/payment-log.entity';
import { PaymentProviderConfig } from './entities/payment-provider-config.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentFactoryService } from './payment-factory.service';
import { PaymentProvider } from './enums/payment-provider.enum';
import { PaymentEventType } from './enums/payment-event-type.enum';
import { PaymentStatus } from '../orders/enums/payment-status.enum';
import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    @InjectRepository(PaymentLog)
    private readonly paymentLogRepository: Repository<PaymentLog>,

    @InjectRepository(PaymentProviderConfig)
    private readonly providerConfigRepository: Repository<PaymentProviderConfig>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly paymentFactory: PaymentFactoryService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== PROVIDER CONFIG (ADMIN) ====================

  /**
   * Get all provider configs (admin view)
   */
  async getAllProviderConfigs(): Promise<PaymentProviderConfig[]> {
    return this.providerConfigRepository.find({
      order: { provider: 'ASC' },
    });
  }

  /**
   * Get enabled providers (customer-facing, for checkout UI)
   */
  async getEnabledProviders(): Promise<PaymentProviderConfig[]> {
    return this.providerConfigRepository.find({
      where: { isEnabled: true },
      order: { provider: 'ASC' },
    });
  }

  /**
   * Update provider config (admin only)
   * Creates the config if it doesn't exist yet.
   */
  async updateProviderConfig(
    provider: PaymentProvider,
    dto: UpdateProviderConfigDto,
  ): Promise<PaymentProviderConfig> {
    let config = await this.providerConfigRepository.findOne({
      where: { provider },
    });

    if (!config) {
      config = this.providerConfigRepository.create({ provider });
    }

    Object.assign(config, dto);
    return this.providerConfigRepository.save(config);
  }

  // ==================== PAYMENT LIFECYCLE ====================

  /**
   * Initialize payment for an order group.
   * Verifies the provider is enabled, calculates total, calls provider SDK.
   */
  async initializePayment(
    orderGroupId: string,
    customerId: string,
    customerEmail: string,
    provider: PaymentProvider,
    callbackUrl?: string,
  ) {
    // Verify provider is enabled
    const providerConfig = await this.providerConfigRepository.findOne({
      where: { provider, isEnabled: true },
    });

    if (!providerConfig) {
      throw new BadRequestException(
        `Payment provider "${provider}" is not enabled on this platform`,
      );
    }

    // Get all orders in the group
    const orders = await this.orderRepository.find({
      where: { orderGroupId },
    });

    if (!orders.length) {
      throw new NotFoundException('No orders found for this order group');
    }

    // Verify customer owns these orders
    if (orders.some((o) => o.customerId !== customerId)) {
      throw new BadRequestException('Order group does not belong to this customer');
    }

    // Verify orders are still in PENDING payment status
    if (orders.some((o) => o.paymentStatus !== PaymentStatus.PENDING)) {
      throw new BadRequestException('One or more orders already have a payment in progress');
    }

    // Calculate total across all orders in the group
    const totalAmount = orders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );

    // Call provider SDK
    const paymentService = this.paymentFactory.getPaymentService(provider);
    const initResult = await paymentService.initializePayment(
      totalAmount,
      providerConfig.supportedCurrencies?.[0] || 'USD',
      {
        customerEmail,
        orderGroupId,
        customerId,
        callbackUrl,
      },
    );

    // Save payment record
    const payment = this.paymentRepository.create({
      orderGroupId,
      provider,
      transactionId: initResult.transactionId,
      transactionType: PaymentTransactionType.CHARGE,
      amount: totalAmount,
      currency: providerConfig.supportedCurrencies?.[0] || 'USD',
      status: PaymentStatus.PENDING,
      customerId,
      customerEmail,
      metadata: {
        orderIds: orders.map((o) => o.id),
        providerResponse: initResult,
      },
    });

    await this.paymentRepository.save(payment);

    // Log the event
    await this.logEvent(
      payment.id,
      provider,
      PaymentEventType.PAYMENT_INITIATED,
      null,
      initResult,
      true,
    );

    this.logger.log(
      `Payment initialized: ${payment.id} via ${provider} for group ${orderGroupId}`,
    );

    return {
      paymentId: payment.id,
      provider,
      amount: totalAmount,
      currency: payment.currency,
      transactionId: initResult.transactionId,
      checkoutUrl: initResult.checkoutUrl,
      clientSecret: initResult.clientSecret,
      metadata: initResult.metadata,
    };
  }

  /**
   * Verify a payment with the provider and update statuses.
   */
  async verifyPayment(reference: string) {
    const payment = await this.paymentRepository.findOne({
      where: { transactionId: reference },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this reference');
    }

    // Already completed — return early (idempotent)
    if (payment.status === PaymentStatus.PAID) {
      return { success: true, alreadyProcessed: true, payment };
    }

    const paymentService = this.paymentFactory.getPaymentService(payment.provider);
    const result = await paymentService.verifyPayment(reference);

    await this.dataSource.transaction(async (manager) => {
      if (result.success) {
        payment.status = PaymentStatus.PAID;
        payment.paidAt = result.paidAt || new Date();

        // Update all orders in the group
        await manager.update(
          Order,
          { orderGroupId: payment.orderGroupId },
          { paymentStatus: PaymentStatus.PAID },
        );

        await this.logEvent(
          payment.id,
          payment.provider,
          PaymentEventType.PAYMENT_SUCCESSFUL,
          null,
          result,
          true,
        );
      } else if (result.status === 'failed') {
        payment.status = PaymentStatus.FAILED;
        payment.failedAt = new Date();
        payment.errorMessage = result.errorMessage || '';

        await this.logEvent(
          payment.id,
          payment.provider,
          PaymentEventType.PAYMENT_FAILED,
          null,
          result,
          true,
        );
      }
      // If pending, leave as-is

      await manager.save(Payment, payment);
    });

    return { success: result.success, payment };
  }

  /**
   * Refund a payment (admin only).
   */
  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only successful payments can be refunded');
    }

    if (payment.isRefunded) {
      throw new BadRequestException('Payment has already been refunded');
    }

    const paymentService = this.paymentFactory.getPaymentService(payment.provider);
    const refundResult = await paymentService.refundPayment(
      payment.transactionId,
      amount,
      reason,
    );

    // Create refund payment record
    const refund = this.paymentRepository.create({
      orderGroupId: payment.orderGroupId,
      provider: payment.provider,
      transactionId: refundResult.refundId || `refund-${payment.id}-${Date.now()}`,
      transactionType: PaymentTransactionType.REFUND,
      amount: refundResult.amount || amount || Number(payment.amount),
      currency: payment.currency,
      status: refundResult.success ? PaymentStatus.PAID : PaymentStatus.PENDING,
      refundedPaymentId: payment.id,
      customerId: payment.customerId,
      customerEmail: payment.customerEmail,
      metadata: { reason, originalPaymentId: payment.id },
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Payment, refund);

      // Mark original as refunded
      payment.isRefunded = true;
      payment.refundedAmount = refund.amount;
      payment.refundedAt = new Date();
      await manager.save(Payment, payment);

      // Update orders to REFUNDED
      if (refundResult.success) {
        await manager.update(
          Order,
          { orderGroupId: payment.orderGroupId },
          { paymentStatus: PaymentStatus.REFUNDED },
        );
      }

      await this.logEvent(
        refund.id,
        payment.provider,
        refundResult.success
          ? PaymentEventType.REFUND_SUCCESSFUL
          : PaymentEventType.REFUND_INITIATED,
        null,
        refundResult,
        true,
      );
    });

    this.logger.log(`Refund processed: ${refund.id} for payment ${payment.id}`);

    return { success: refundResult.success, refund };
  }

  // ==================== WEBHOOK PROCESSING ====================

  /**
   * Process a webhook event from a payment provider.
   * Handles idempotency via providerEventId.
   */
  async processWebhookEvent(
    provider: PaymentProvider,
    event: Record<string, any>,
  ) {
    // Extract provider-specific event ID for idempotency
    const providerEventId = this.extractEventId(provider, event);

    // Check for duplicate webhook (idempotency)
    if (providerEventId) {
      const existing = await this.paymentLogRepository.findOne({
        where: { providerEventId, provider },
      });

      if (existing?.processed) {
        this.logger.log(
          `Skipping duplicate webhook: ${providerEventId} (${provider})`,
        );
        return { processed: false, reason: 'duplicate' };
      }
    }

    // Extract transaction reference from event
    const reference = this.extractTransactionReference(provider, event);

    if (!reference) {
      this.logger.warn(`Could not extract reference from ${provider} webhook`);
      await this.logEvent(
        null,
        provider,
        PaymentEventType.PAYMENT_FAILED,
        providerEventId,
        event,
        true,
      );
      return { processed: false, reason: 'no_reference' };
    }

    // Verify payment with provider
    const result = await this.verifyPayment(reference);

    // Log the webhook event
    await this.logEvent(
      result.payment?.id || null,
      provider,
      result.success
        ? PaymentEventType.PAYMENT_SUCCESSFUL
        : PaymentEventType.PAYMENT_FAILED,
      providerEventId,
      event,
      true,
    );

    return { processed: true, success: result.success };
  }

  // ==================== QUERY METHODS ====================

  /**
   * Find a payment by ID
   */
  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Find all payments for an order group
   */
  async findByOrderGroup(orderGroupId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { orderGroupId },
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== HELPERS ====================

  private extractEventId(
    provider: PaymentProvider,
    event: Record<string, any>,
  ): string | null {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return event.id || null; // Stripe event ID (evt_...)
      case PaymentProvider.PAYSTACK:
        return event.data?.id ? String(event.data.id) : null;
      case PaymentProvider.FLUTTERWAVE:
        return event.data?.id ? String(event.data.id) : null;
      default:
        return null;
    }
  }

  private extractTransactionReference(
    provider: PaymentProvider,
    event: Record<string, any>,
  ): string | null {
    switch (provider) {
      case PaymentProvider.STRIPE:
        // Stripe: event.data.object is the PaymentIntent
        return event.data?.object?.id || null;
      case PaymentProvider.PAYSTACK:
        return event.data?.reference || null;
      case PaymentProvider.FLUTTERWAVE:
        return event.data?.tx_ref || null;
      default:
        return null;
    }
  }

  private async logEvent(
    paymentId: string | null,
    provider: PaymentProvider,
    eventType: PaymentEventType,
    providerEventId: string | null,
    payload: any,
    signatureVerified: boolean,
  ) {
    const log = new PaymentLog();
    log.paymentId = paymentId;
    log.provider = provider;
    log.eventType = eventType;
    log.providerEventId = providerEventId;
    log.payload = payload;
    log.signatureVerified = signatureVerified;
    log.processed = true;
    log.processedAt = new Date();

    await this.paymentLogRepository.save(log);
  }
}
