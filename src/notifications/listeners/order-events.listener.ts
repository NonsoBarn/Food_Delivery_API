/**
 * OrderEventsListener
 *
 * Listens for order-related events emitted by OrdersService and broadcasts
 * them to the appropriate WebSocket clients.
 *
 * KEY LEARNING: The Listener Pattern (Observer Pattern)
 * ======================================================
 * This class is a "subscriber" in the publish-subscribe model:
 *
 *   Publisher (OrdersService): "An order was created!" → fires event
 *   Subscriber (this class): "I heard that!" → broadcasts via WebSocket
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
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { NOTIFICATION_EVENTS } from '../events/notification-events';
import type {
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
} from '../events/notification-events';
import { OrderStatus } from '../../orders/enums/order-status.enum';

@Injectable()
export class OrderEventsListener {
  private readonly logger = new Logger(OrderEventsListener.name);

  /**
   * We inject the gateway to access its `server` (the Socket.io Server).
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
  constructor(private readonly gateway: NotificationsGateway) {}

  /**
   * Notify the vendor of a new incoming order.
   *
   * Called after OrdersService.createOrder() commits the transaction.
   * The vendor might be on their dashboard tab waiting for orders — this
   * makes their order counter increment in real time.
   *
   * Room target: vendor:{vendorProfileId}
   *   Only the relevant vendor receives this. Their socket joined this
   *   room automatically when they connected (see gateway.joinRoleRooms).
   */
  @OnEvent(NOTIFICATION_EVENTS.ORDER_CREATED)
  handleOrderCreated(event: OrderCreatedEvent): void {
    this.logger.log(
      `Broadcasting new order ${event.orderNumber} to vendor:${event.vendorProfileId}`,
    );

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
  }

  /**
   * Broadcast order status changes to all parties watching the order.
   *
   * Different status transitions carry different meanings:
   * - CONFIRMED → "Your order is confirmed!" (customer's relief)
   * - PREPARING → "Kitchen is cooking!" (customer anticipation)
   * - READY_FOR_PICKUP → Trigger auto-assignment process (backend logic)
   * - PICKED_UP → "Rider has your food!" (customer tracking)
   * - DELIVERED → "Enjoy your meal!" (completion)
   * - CANCELLED → "Order cancelled" (recovery needed)
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
  handleOrderStatusUpdated(event: OrderStatusUpdatedEvent): void {
    this.logger.log(
      `Broadcasting order ${event.orderNumber} status: ${event.previousStatus} → ${event.newStatus}`,
    );

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
  }

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
}
