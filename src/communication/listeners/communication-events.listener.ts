import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';

import { CustomerProfile } from '../../users/entities/customer-profile.entity';
import { VendorProfile } from '../../users/entities/vendor-profile.entity';
import { Order } from '../../orders/entities/order.entity';

/**
 * KEY LEARNING: TS1272 — split value and type imports from the same module
 * =========================================================================
 * NOTIFICATION_EVENTS is a const (a value) — regular import.
 * The event interfaces are types only — they must use `import type`
 * when they appear as parameters in decorated (@OnEvent) methods.
 *
 * TypeScript's `isolatedModules` + `emitDecoratorMetadata` modes require
 * this split because the compiler emits runtime metadata for decorated
 * parameters and needs to know at compile time if something is type-only.
 */
import { NOTIFICATION_EVENTS } from '../../notifications/events/notification-events';
import type {
  UserRegisteredEvent,
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
  DeliveryAssignedEvent,
  DeliveryStatusUpdatedEvent,
} from '../../notifications/events/notification-events';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { DeliveryStatus } from '../../delivery/enums/delivery-status.enum';

/**
 * CommunicationEventsListener
 *
 * This is the bridge between the event bus and the email/SMS queues.
 *
 * KEY LEARNING: Single listener for multiple channels
 * ====================================================
 * Instead of having a separate "EmailListener" and "SmsListener",
 * we use ONE listener that handles all events and decides what
 * to queue for each channel.
 *
 * This keeps the routing logic centralised:
 *   - "What triggers an email?" — look in this file
 *   - "What triggers an SMS?"  — look in this file
 *   - "Why no SMS for welcome?" — look in this file
 *
 * KEY LEARNING: @OnEvent decorator
 * ==================================
 * @OnEvent(NOTIFICATION_EVENTS.ORDER_CREATED) subscribes to the 'order.created'
 * event emitted via EventEmitter2. The same event already triggers the
 * WebSocket listener in src/notifications/ — this listener ADDS to that
 * flow without changing it.
 *
 * KEY LEARNING: DB lookups in a listener are fine
 * =================================================
 * Event payloads carry IDs, not full objects (to keep payloads small).
 * The listener queries the DB to get email addresses, phone numbers, etc.
 * This is acceptable because:
 * - The listener runs AFTER the HTTP response (async, background)
 * - The DB query is cheap and isolated
 * - The result is queued into BullMQ, not sent synchronously
 *
 * Errors in @OnEvent handlers are caught by EventEmitter2 and logged.
 * They do NOT propagate back to the original service that emitted the event.
 * Always wrap in try/catch to avoid silent swallowing of errors.
 */
@Injectable()
export class CommunicationEventsListener {
  private readonly logger = new Logger(CommunicationEventsListener.name);

  constructor(
    private readonly mailService: MailService,
    private readonly smsService: SmsService,

    @InjectRepository(CustomerProfile)
    private readonly customerRepo: Repository<CustomerProfile>,

    @InjectRepository(VendorProfile)
    private readonly vendorRepo: Repository<VendorProfile>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  // ==================== USER EVENTS ====================

  /**
   * Welcome email on registration.
   * No SMS — we don't have a phone number yet at registration time.
   */
  @OnEvent(NOTIFICATION_EVENTS.USER_REGISTERED)
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    try {
      await this.mailService.queueWelcomeEmail(event.email, event.role);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to queue welcome email for ${event.email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ==================== ORDER EVENTS ====================

  /**
   * Order confirmation — email + SMS to customer.
   *
   * We look up the customer profile and vendor name from the DB
   * so the email has all the context it needs.
   */
  @OnEvent(NOTIFICATION_EVENTS.ORDER_CREATED)
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      // Load customer profile + user (for email address)
      const customer = await this.customerRepo.findOne({
        where: { id: event.customerId },
        relations: ['user'], // Join user to get email
      });

      if (!customer?.user) {
        this.logger.warn(
          `handleOrderCreated: customer ${event.customerId} not found`,
        );
        return;
      }

      // Load vendor for the business name
      const vendor = await this.vendorRepo.findOne({
        where: { id: event.vendorProfileId },
      });

      // Load order for delivery address
      const order = await this.orderRepo.findOne({
        where: { id: event.orderId },
      });

      // Queue order confirmation email
      await this.mailService.queueOrderConfirmationEmail({
        to: customer.user.email,
        orderNumber: event.orderNumber,
        total: event.total,
        itemCount: event.itemCount,
        vendorName: vendor?.businessName ?? 'Your restaurant',
        deliveryAddress: order?.deliveryAddress ?? 'Your saved address',
      });

      // Queue order confirmation SMS (only if phone number is on file)
      if (customer.phoneNumber) {
        await this.smsService.queueOrderConfirmationSms({
          to: customer.phoneNumber,
          orderNumber: event.orderNumber,
          vendorName: vendor?.businessName,
        });
      }
    } catch (error: unknown) {
      this.logger.error(
        `handleOrderCreated error for order ${event.orderNumber}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Order status update — email + SMS for CONFIRMED and CANCELLED.
   *
   * We only notify for status changes the customer cares about.
   * PREPARING, READY_FOR_PICKUP, PICKED_UP are internal statuses
   * that the WebSocket real-time channel covers adequately.
   */
  @OnEvent(NOTIFICATION_EVENTS.ORDER_STATUS_UPDATED)
  async handleOrderStatusUpdated(
    event: OrderStatusUpdatedEvent,
  ): Promise<void> {
    // Only handle statuses relevant to the customer via email/SMS
    const notifiableStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.CANCELLED,
    ];

    if (!notifiableStatuses.includes(event.newStatus)) {
      return; // Skip PREPARING, READY_FOR_PICKUP, etc.
    }

    try {
      const customer = await this.customerRepo.findOne({
        where: { id: event.customerId },
        relations: ['user'],
      });

      if (!customer?.user) return;

      // Queue status update email
      await this.mailService.queueOrderStatusUpdateEmail({
        to: customer.user.email,
        orderNumber: event.orderNumber,
        newStatus: event.newStatus,
        reason: event.cancellationReason,
        estimatedPrepTimeMinutes: event.estimatedPrepTimeMinutes,
      });

      // Queue cancellation SMS (CONFIRMED is covered by order.created SMS)
      if (
        customer.phoneNumber &&
        event.newStatus === OrderStatus.CANCELLED
      ) {
        await this.smsService.queueOrderCancelledSms({
          to: customer.phoneNumber,
          orderNumber: event.orderNumber,
        });
      }
    } catch (error: unknown) {
      this.logger.error(
        `handleOrderStatusUpdated error for order ${event.orderNumber}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ==================== DELIVERY EVENTS ====================

  /**
   * Rider assigned — SMS to customer so they know someone is coming.
   */
  @OnEvent(NOTIFICATION_EVENTS.DELIVERY_ASSIGNED)
  async handleDeliveryAssigned(event: DeliveryAssignedEvent): Promise<void> {
    try {
      const customer = await this.customerRepo.findOne({
        where: { id: event.customerId },
        relations: ['user'],
      });

      if (!customer?.phoneNumber) return;

      await this.smsService.queueDeliveryAssignedSms({
        to: customer.phoneNumber,
        orderNumber: event.orderNumber,
      });
    } catch (error: unknown) {
      this.logger.error(
        `handleDeliveryAssigned error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delivery completed — email receipt + SMS to customer.
   */
  @OnEvent(NOTIFICATION_EVENTS.DELIVERY_COMPLETED)
  async handleDeliveryCompleted(
    event: DeliveryStatusUpdatedEvent,
  ): Promise<void> {
    // Guard: only act on COMPLETED status
    if (event.newStatus !== DeliveryStatus.DELIVERED) return;

    try {
      const customer = await this.customerRepo.findOne({
        where: { id: event.customerId },
        relations: ['user'],
      });

      if (!customer?.user) return;

      // Load order for order number
      const order = await this.orderRepo.findOne({
        where: { id: event.orderId },
      });

      if (!order) return;

      // Queue delivery completion email
      await this.mailService.queueDeliveryCompletionEmail({
        to: customer.user.email,
        orderNumber: order.orderNumber,
        deliveredAt: event.timestamp,
      });

      // Queue delivery completion SMS
      if (customer.phoneNumber) {
        await this.smsService.queueDeliveryCompletionSms({
          to: customer.phoneNumber,
          orderNumber: order.orderNumber,
        });
      }
    } catch (error: unknown) {
      this.logger.error(
        `handleDeliveryCompleted error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
