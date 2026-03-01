/**
 * OrderEventsListener
 *
 * Listens for order-related events emitted by OrdersService and:
 * 1. Broadcasts them to the appropriate WebSocket clients (Phase 9)
 * 2. Persists them as in-app notifications in the database (Phase 10.3)
 *
 * KEY LEARNING: The Listener Pattern (Observer Pattern)
 * ======================================================
 * This class is a "subscriber" in the publish-subscribe model:
 *
 *   Publisher (OrdersService): "An order was created!" → fires event
 *   Subscriber (this class): "I heard that!" → broadcasts via WebSocket + saves to DB
 *
 * The publisher (OrdersService) has NO KNOWLEDGE of this listener.
 * It just fires an event string and provides a data payload.
 * The listener doesn't need to be imported by the publisher.
 *
 * This is the OPEN/CLOSED PRINCIPLE in practice:
 * - Open for extension: Add a new listener (SMS, push notification) without
 *   touching OrdersService
 * - Closed for modification: OrdersService never changes when you add listeners
 *
 * KEY LEARNING: Resolving profileId → userId
 * ============================================
 * Event payloads carry profile IDs (customerId = CustomerProfile.id,
 * vendorProfileId = VendorProfile.id) — not User.id.
 *
 * In-app notifications need User.id (the actual auth user, not their profile).
 *
 * Solution: Look up the profile by its ID and read the `.userId` column.
 * Both CustomerProfile and VendorProfile have a `userId: string` column
 * that holds the User.id FK.
 *
 * This is the same lookup pattern used in CommunicationEventsListener.
 *
 * KEY LEARNING: Async void event handlers
 * =========================================
 * @OnEvent handlers CAN be async. The event emitter fires them and
 * doesn't wait (fire-and-forget). This is acceptable for notifications
 * because eventual consistency is fine — the user might see the notification
 * a fraction of a second later. The important guarantee is that the
 * originating business operation (order creation) already succeeded.
 *
 * KEY LEARNING: @OnEvent vs @SubscribeMessage
 * ============================================
 * @SubscribeMessage — handles messages sent FROM clients (WebSocket clients → server)
 * @OnEvent — handles events fired WITHIN the server (service → event bus → listener)
 *
 * They're fundamentally different channels:
 * - WebSocket: customer's phone → your server
 * - EventEmitter: your OrdersService → your OrderEventsListener
 *
 * KEY LEARNING: Room Targeting
 * ==============================
 * When broadcasting, we pick the most specific room:
 *
 * order:new → vendor:{vendorId}
 *   Only the specific vendor whose menu was ordered from
 *   Not ALL vendors, not ALL users — just that vendor's devices
 *
 * order:status_updated → order:{orderId}
 *   Everyone currently watching this order:
 *   - Customer: on their order tracking page
 *   - Vendor: on their order management dashboard
 *   - Rider: on their delivery app
 *   All joined this room via 'order:subscribe' message
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { NotificationService } from '../notifications.service';
import { NotificationType } from '../enums/notification-type.enum';
import { NOTIFICATION_EVENTS } from '../events/notification-events';
import type {
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
} from '../events/notification-events';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { CustomerProfile } from '../../users/entities/customer-profile.entity';
import { VendorProfile } from '../../users/entities/vendor-profile.entity';

@Injectable()
export class OrderEventsListener {
  private readonly logger = new Logger(OrderEventsListener.name);

  constructor(
    /**
     * Gateway — for real-time WebSocket broadcasts (Phase 9, unchanged).
     *
     * KEY LEARNING: Why inject the gateway and not a service?
     * =========================================================
     * The gateway OWNS the WebSocket server (this.server).
     * To broadcast to clients, you must go through the server instance.
     * There's no "WebSocket broadcast service" in between — that would
     * just be another layer for no reason.
     *
     * This IS a dependency, but it's a valid one:
     * - The listener's job IS to broadcast
     * - The gateway IS the broadcaster
     * - No circular dependency: Gateway doesn't need the listener
     */
    private readonly gateway: NotificationsGateway,

    /**
     * NotificationService — for persisting notifications to DB (Phase 10.3).
     *
     * KEY LEARNING: Why inject a service instead of the repository directly?
     * ========================================================================
     * NotificationService.create() does TWO things:
     * 1. Saves to DB (repository)
     * 2. Pushes via WebSocket to user:{userId} (real-time push)
     *
     * If we injected just the repo, we'd have to duplicate the gateway push
     * logic here. Using the service respects the Single Responsibility Principle.
     */
    private readonly notificationService: NotificationService,

    /**
     * Profile repositories — needed to resolve profile IDs → User.id.
     *
     * Event payloads use profile IDs, but notifications need User.id.
     * CustomerProfile and VendorProfile each have a `userId: string` column
     * (the FK to users table) — we read that without loading the user relation.
     *
     * KEY LEARNING: Can you register the same entity repo in multiple modules?
     * ==========================================================================
     * YES — TypeOrmModule.forFeature([CustomerProfile]) in this module's
     * imports gives us read access without affecting UsersModule's ownership.
     * TypeORM doesn't have "exclusive access" — it's just a repository factory.
     */
    @InjectRepository(CustomerProfile)
    private readonly customerRepo: Repository<CustomerProfile>,

    @InjectRepository(VendorProfile)
    private readonly vendorRepo: Repository<VendorProfile>,
  ) {}

  /**
   * Handle a new order being created.
   *
   * WHO gets a notification:
   *   VENDOR → "You have a new order to confirm!"
   *   CUSTOMER → "Your order has been placed!"
   *
   * WHY two separate notifications?
   *   Each has different text and different target user.
   *   The vendor wants to know they have work to do.
   *   The customer wants to know their order went through.
   */
  @OnEvent(NOTIFICATION_EVENTS.ORDER_CREATED)
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(
      `Broadcasting new order ${event.orderNumber} to vendor:${event.vendorProfileId}`,
    );

    // ── Phase 9: WebSocket real-time broadcast (unchanged) ────────────────────

    this.gateway.server
      .to(`vendor:${event.vendorProfileId}`)
      .emit('order:new', {
        orderId: event.orderId,
        orderNumber: event.orderNumber,
        total: event.total,
        itemCount: event.itemCount,
        createdAt: event.createdAt,
      });

    // Also notify admins (they see all new orders in the admin panel)
    this.gateway.server.to('admin').emit('order:new', event);

    // ── Phase 10.3: Persist in-app notifications ──────────────────────────────

    /**
     * KEY LEARNING: Parallel profile lookups with Promise.all()
     * ===========================================================
     * We need to look up two profiles (vendor and customer) to get their userId.
     *
     * Sequential (slow):
     *   const vendor = await this.vendorRepo.findOne(...);    // wait...
     *   const customer = await this.customerRepo.findOne(...) // wait again
     *   total time = vendor time + customer time
     *
     * Parallel (fast):
     *   const [vendor, customer] = await Promise.all([...]);
     *   total time = max(vendor time, customer time)
     *
     * Always use Promise.all() for independent async operations.
     */
    const [vendor, customer] = await Promise.all([
      this.vendorRepo.findOne({ where: { id: event.vendorProfileId } }),
      this.customerRepo.findOne({ where: { id: event.customerId } }),
    ]);

    // Notify the vendor: they need to confirm or reject this order
    if (vendor) {
      await this.notificationService.create({
        userId: vendor.userId,
        type: NotificationType.ORDER_CREATED,
        title: `New Order: ${event.orderNumber}`,
        message: `You have a new order with ${event.itemCount} item${event.itemCount > 1 ? 's' : ''} totalling ₦${Number(event.total).toFixed(2)}. Please confirm promptly.`,
        data: {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          total: event.total,
          itemCount: event.itemCount,
        },
      });
    }

    // Notify the customer: their order was successfully placed
    if (customer) {
      await this.notificationService.create({
        userId: customer.userId,
        type: NotificationType.ORDER_CREATED,
        title: `Order Placed: ${event.orderNumber}`,
        message: `Your order has been placed successfully! Waiting for the restaurant to confirm.`,
        data: {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          total: event.total,
        },
      });
    }
  }

  /**
   * Broadcast order status changes to all parties watching the order
   * AND persist a notification for the customer.
   *
   * Different status transitions carry different meanings:
   * - CONFIRMED → "Your order is confirmed!" (customer's relief)
   * - PREPARING → "Kitchen is cooking!" (customer anticipation)
   * - READY_FOR_PICKUP → internal logistics, no customer notification
   * - CANCELLED → both customer and vendor notified
   *
   * KEY LEARNING: Selective notifications
   * =======================================
   * Not every status change needs a persistent notification.
   * READY_FOR_PICKUP is an internal logistics state — the customer
   * doesn't need to know (they'll be notified when the rider picks up).
   * Sending fewer, more meaningful notifications reduces notification fatigue.
   *
   * Room target: order:{orderId}
   *   Customer, vendor, and rider all join this room when viewing the order.
   *   One emit reaches all of them.
   *
   * KEY LEARNING: Fan-out vs Targeted
   * ====================================
   * This uses a single room for all parties (fan-out to order room).
   * An alternative: emit separately to customer, vendor, and rider rooms.
   * Fan-out is simpler; targeted is more flexible for role-specific payloads.
   * We use fan-out here because all parties need the same information.
   */
  @OnEvent(NOTIFICATION_EVENTS.ORDER_STATUS_UPDATED)
  async handleOrderStatusUpdated(
    event: OrderStatusUpdatedEvent,
  ): Promise<void> {
    this.logger.log(
      `Broadcasting order ${event.orderNumber} status: ${event.previousStatus} → ${event.newStatus}`,
    );

    // ── Phase 9: WebSocket real-time broadcast (unchanged) ────────────────────

    const socketEvent = this.buildStatusUpdatePayload(event);

    // Broadcast to all parties watching this order
    this.gateway.server
      .to(`order:${event.orderId}`)
      .emit('order:status_updated', socketEvent);

    // Special case: cancellation also triggers admin alert
    if (event.newStatus === OrderStatus.CANCELLED) {
      this.gateway.server.to('admin').emit('order:cancelled', {
        orderId: event.orderId,
        orderNumber: event.orderNumber,
        reason: event.cancellationReason,
        cancelledBy: event.updatedBy,
      });
    }

    // ── Phase 10.3: Persist in-app notifications ──────────────────────────────

    const content = this.buildStatusNotificationContent(event);

    // Only create notification for meaningful customer-facing status changes
    if (content) {
      const customer = await this.customerRepo.findOne({
        where: { id: event.customerId },
      });

      if (customer) {
        await this.notificationService.create({
          userId: customer.userId,
          type: content.type,
          title: content.title,
          message: content.message,
          data: {
            orderId: event.orderId,
            orderNumber: event.orderNumber,
            newStatus: event.newStatus,
            ...(event.estimatedPrepTimeMinutes && {
              estimatedPrepTimeMinutes: event.estimatedPrepTimeMinutes,
            }),
            ...(event.cancellationReason && {
              cancellationReason: event.cancellationReason,
            }),
          },
        });
      }
    }

    // Also notify the vendor on cancellation
    if (event.newStatus === OrderStatus.CANCELLED && event.vendorProfileId) {
      const vendor = await this.vendorRepo.findOne({
        where: { id: event.vendorProfileId },
      });
      if (vendor) {
        await this.notificationService.create({
          userId: vendor.userId,
          type: NotificationType.ORDER_CANCELLED,
          title: `Order Cancelled: ${event.orderNumber}`,
          message: `Order ${event.orderNumber} has been cancelled.${event.cancellationReason ? ` Reason: ${event.cancellationReason}` : ''}`,
          data: {
            orderId: event.orderId,
            orderNumber: event.orderNumber,
            cancellationReason: event.cancellationReason,
          },
        });
      }
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Build the payload sent to WebSocket clients.
   *
   * We intentionally DON'T send everything — only what the client needs.
   * Sending the entire Order entity would include internal IDs, DB timestamps,
   * and other fields the frontend doesn't need (and shouldn't see).
   *
   * This is the "view model" pattern: database model → client-facing payload.
   */
  private buildStatusUpdatePayload(event: OrderStatusUpdatedEvent) {
    return {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      status: event.newStatus,
      previousStatus: event.previousStatus,
      updatedBy: event.updatedBy,
      timestamp: event.timestamp,
      ...(event.estimatedPrepTimeMinutes && {
        estimatedPrepTimeMinutes: event.estimatedPrepTimeMinutes,
      }),
      ...(event.cancellationReason && {
        cancellationReason: event.cancellationReason,
      }),
    };
  }

  /**
   * Map order status transitions to notification content.
   *
   * Returns null for statuses that should NOT generate a persistent notification.
   *
   * KEY LEARNING: Return null for "no-op" cases
   * =============================================
   * Instead of a long if/else chain with empty branches,
   * returning null makes the intent explicit:
   * "there is no notification to create for this status."
   * The caller checks for null and skips the DB write entirely.
   */
  private buildStatusNotificationContent(
    event: OrderStatusUpdatedEvent,
  ): { type: NotificationType; title: string; message: string } | null {
    const { orderNumber, newStatus, estimatedPrepTimeMinutes } = event;

    switch (newStatus) {
      case OrderStatus.CONFIRMED:
        return {
          type: NotificationType.ORDER_CONFIRMED,
          title: `Order Confirmed: ${orderNumber}`,
          message: estimatedPrepTimeMinutes
            ? `Your order has been confirmed! Estimated prep time: ${estimatedPrepTimeMinutes} minutes.`
            : `Your order has been confirmed by the restaurant!`,
        };

      case OrderStatus.PREPARING:
        return {
          type: NotificationType.ORDER_PREPARING,
          title: `Order Being Prepared: ${orderNumber}`,
          message: `The kitchen has started preparing your order. Hang tight!`,
        };

      case OrderStatus.READY_FOR_PICKUP:
        return {
          type: NotificationType.ORDER_READY,
          title: `Order Ready: ${orderNumber}`,
          message: `Your order is packed and ready! A rider is being assigned.`,
        };

      case OrderStatus.CANCELLED:
        return {
          type: NotificationType.ORDER_CANCELLED,
          title: `Order Cancelled: ${orderNumber}`,
          message: event.cancellationReason
            ? `Your order has been cancelled. Reason: ${event.cancellationReason}`
            : `Your order has been cancelled.`,
        };

      default:
        // PENDING, PICKED_UP, DELIVERED — handled by delivery listener or no notification
        return null;
    }
  }
}
