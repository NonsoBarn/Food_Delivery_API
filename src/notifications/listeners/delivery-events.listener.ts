/**
 * DeliveryEventsListener
 *
 * Listens for delivery lifecycle events from DeliveryService and:
 * 1. Broadcasts the right notifications to the right WebSocket clients (Phase 9)
 * 2. Persists them as in-app notifications in the database (Phase 10.3)
 *
 * KEY LEARNING: Different Events, Different Rooms
 * =================================================
 * Not every event goes to the same room:
 *
 * delivery.assigned → rider:{riderId}
 *   Only the specific rider needs to know they've been assigned.
 *   (They need to accept or reject ASAP.)
 *
 * delivery.accepted / delivery.rejected → order:{orderId}
 *   The customer and vendor want to know their delivery status.
 *   (Was a rider found? Did they accept?)
 *
 * delivery.picked_up / delivery.completed → order:{orderId}
 *   Customer is tracking their food in real time.
 *
 * delivery.cancelled → order:{orderId} + admin
 *   Everyone watching the order needs to know.
 *   Admin may need to manually reassign.
 *
 * KEY LEARNING: Separation of Concerns
 * ======================================
 * This listener doesn't know WHY a delivery was assigned or rejected.
 * It only knows THAT it happened and WHERE to broadcast the notification.
 *
 * DeliveryService contains the business rules.
 * This listener contains the notification routing.
 * NotificationsGateway contains the WebSocket mechanics.
 * NotificationService contains the persistence + real-time push.
 *
 * Each class has ONE clear responsibility.
 *
 * KEY LEARNING: Which user to notify for delivery events?
 * =========================================================
 * Delivery events affect multiple parties differently:
 *
 * DELIVERY_ASSIGNED → notify the RIDER (they have a new job)
 * DELIVERY_ACCEPTED → notify the CUSTOMER (their rider is coming)
 * DELIVERY_PICKED_UP → notify the CUSTOMER (food is on the way!)
 * DELIVERY_COMPLETED → notify the CUSTOMER (enjoy your meal!)
 * DELIVERY_CANCELLED → notify the CUSTOMER (no rider available)
 *
 * We look up RiderProfile.userId to find the rider's User.id
 * and CustomerProfile.userId to find the customer's User.id.
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
  DeliveryAssignedEvent,
  DeliveryStatusUpdatedEvent,
} from '../events/notification-events';
import { DeliveryStatus } from '../../delivery/enums/delivery-status.enum';
import { RiderProfile } from '../../users/entities/rider-profile.entity';
import { CustomerProfile } from '../../users/entities/customer-profile.entity';

@Injectable()
export class DeliveryEventsListener {
  private readonly logger = new Logger(DeliveryEventsListener.name);

  constructor(
    private readonly gateway: NotificationsGateway,
    private readonly notificationService: NotificationService,

    @InjectRepository(RiderProfile)
    private readonly riderRepo: Repository<RiderProfile>,

    @InjectRepository(CustomerProfile)
    private readonly customerRepo: Repository<CustomerProfile>,
  ) {}

  /**
   * Notify a rider they've been assigned a delivery.
   *
   * This is one of the most critical notifications — the rider needs to
   * see this IMMEDIATELY on their device so they can accept before the
   * timeout (typically 30-60 seconds in production apps).
   *
   * The payload includes pickup + dropoff coordinates so the rider can
   * see the route even before accepting.
   *
   * Room target: rider:{riderId} → the rider's socket.
   * If the rider has multiple devices, all of them receive the notification.
   *
   * KEY LEARNING: Critical vs informational notifications
   * =======================================================
   * DELIVERY_ASSIGNED is critical — the rider MUST see it quickly.
   * DELIVERY_COMPLETED is informational — the customer sees it in their inbox.
   *
   * Both get persisted in the DB, but the delivery_assigned notification
   * is the most time-sensitive one in the entire system.
   */
  @OnEvent(NOTIFICATION_EVENTS.DELIVERY_ASSIGNED)
  async handleDeliveryAssigned(event: DeliveryAssignedEvent): Promise<void> {
    this.logger.log(
      `Broadcasting delivery assignment ${event.deliveryId} to rider:${event.riderId}`,
    );

    // ── Phase 9: WebSocket real-time broadcast (unchanged) ────────────────────

    this.gateway.server.to(`rider:${event.riderId}`).emit('delivery:assigned', {
      deliveryId: event.deliveryId,
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      assignmentType: event.assignmentType,
      pickupLatitude: event.pickupLatitude,
      pickupLongitude: event.pickupLongitude,
      dropoffLatitude: event.dropoffLatitude,
      dropoffLongitude: event.dropoffLongitude,
      estimatedDistanceKm: event.estimatedDistanceKm,
      estimatedDurationMinutes: event.estimatedDurationMinutes,
    });

    // Also tell the customer "a rider is on their way" context update
    this.gateway.server
      .to(`order:${event.orderId}`)
      .emit('delivery:status_updated', {
        deliveryId: event.deliveryId,
        status: DeliveryStatus.PENDING_ACCEPTANCE,
        message: 'Finding a rider for your order...',
        timestamp: new Date(),
      });

    // ── Phase 10.3: Persist in-app notifications ──────────────────────────────

    // Notify the rider (they have a new delivery job)
    const rider = await this.riderRepo.findOne({ where: { id: event.riderId } });
    if (rider) {
      const distanceMsg = event.estimatedDistanceKm
        ? ` Distance: ${event.estimatedDistanceKm.toFixed(1)}km.`
        : '';
      await this.notificationService.create({
        userId: rider.userId,
        type: NotificationType.DELIVERY_ASSIGNED,
        title: `New Delivery: ${event.orderNumber}`,
        message: `You have been assigned a delivery for order ${event.orderNumber}.${distanceMsg} Please accept or reject promptly.`,
        data: {
          deliveryId: event.deliveryId,
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          estimatedDistanceKm: event.estimatedDistanceKm,
          estimatedDurationMinutes: event.estimatedDurationMinutes,
        },
      });
    }
  }

  /**
   * Rider accepted the delivery.
   *
   * Customer receives good news: "Your rider is confirmed and heading to pick up."
   * Vendor gets context: the order is now in transit.
   *
   * Room target: order:{orderId}
   *   Both customer (on order tracking page) and vendor (on dashboard) receive this.
   */
  @OnEvent(NOTIFICATION_EVENTS.DELIVERY_ACCEPTED)
  async handleDeliveryAccepted(
    event: DeliveryStatusUpdatedEvent,
  ): Promise<void> {
    this.logger.log(
      `Delivery ${event.deliveryId} accepted — broadcasting to order:${event.orderId}`,
    );

    // ── Phase 9: WebSocket real-time broadcast ────────────────────────────────

    this.gateway.server
      .to(`order:${event.orderId}`)
      .emit('delivery:status_updated', {
        deliveryId: event.deliveryId,
        status: event.newStatus,
        message: 'Rider accepted! They are heading to the restaurant.',
        timestamp: event.timestamp,
      });

    // ── Phase 10.3: Persist in-app notification for the customer ─────────────

    const customer = await this.customerRepo.findOne({
      where: { id: event.customerId },
    });
    if (customer) {
      await this.notificationService.create({
        userId: customer.userId,
        type: NotificationType.DELIVERY_ACCEPTED,
        title: 'Rider Accepted Your Order',
        message: 'A rider has accepted your delivery and is heading to the restaurant to pick up your food.',
        data: {
          deliveryId: event.deliveryId,
          orderId: event.orderId,
        },
      });
    }
  }

  /**
   * Rider rejected the delivery.
   *
   * The customer doesn't need to panic — the system will auto-assign or
   * an admin will reassign. So we send a reassuring message.
   *
   * Admin is notified too — they may need to manually reassign if no riders
   * are available nearby.
   *
   * Room target: order:{orderId} for customer, 'admin' for admins
   *
   * KEY LEARNING: No customer DB notification on rejection
   * =======================================================
   * We skip creating a DB notification for the customer here.
   * Reason: rejection is a transient state — another rider will be
   * auto-assigned immediately. Showing "Rider rejected" in the inbox
   * would confuse the customer ("Wait, what? My order failed?").
   *
   * The WebSocket real-time update says "Looking for another rider..."
   * which is enough. We let the next acceptance/assignment create the
   * positive notification.
   */
  @OnEvent(NOTIFICATION_EVENTS.DELIVERY_REJECTED)
  handleDeliveryRejected(event: DeliveryStatusUpdatedEvent): void {
    this.logger.log(
      `Delivery ${event.deliveryId} rejected — broadcasting to order and admin`,
    );

    this.gateway.server
      .to(`order:${event.orderId}`)
      .emit('delivery:status_updated', {
        deliveryId: event.deliveryId,
        status: event.newStatus,
        message: 'Looking for another rider...',
        timestamp: event.timestamp,
      });

    // Alert admins to possibly reassign manually
    this.gateway.server.to('admin').emit('delivery:rider_rejected', {
      deliveryId: event.deliveryId,
      orderId: event.orderId,
      riderId: event.riderId,
      timestamp: event.timestamp,
    });

    // No DB notification for the customer — transient state, another rider coming
  }

  /**
   * Rider picked up the food from the vendor.
   *
   * This is an exciting moment for the customer — food is on its way!
   * This is also when the customer's real-time location tracking UI
   * becomes active (they'll start receiving 'delivery:location_updated' events).
   *
   * Room target: order:{orderId}
   */
  @OnEvent(NOTIFICATION_EVENTS.DELIVERY_PICKED_UP)
  async handleDeliveryPickedUp(
    event: DeliveryStatusUpdatedEvent,
  ): Promise<void> {
    this.logger.log(
      `Delivery ${event.deliveryId} picked up — broadcasting to order:${event.orderId}`,
    );

    // ── Phase 9: WebSocket real-time broadcast ────────────────────────────────

    this.gateway.server
      .to(`order:${event.orderId}`)
      .emit('delivery:status_updated', {
        deliveryId: event.deliveryId,
        status: event.newStatus,
        message: 'Your food has been picked up! Rider is heading to you.',
        timestamp: event.timestamp,
      });

    // ── Phase 10.3: Persist in-app notification for the customer ─────────────

    const customer = await this.customerRepo.findOne({
      where: { id: event.customerId },
    });
    if (customer) {
      await this.notificationService.create({
        userId: customer.userId,
        type: NotificationType.DELIVERY_PICKED_UP,
        title: 'Food Picked Up!',
        message: 'Your food has been picked up from the restaurant. The rider is now heading to you — track in real time!',
        data: {
          deliveryId: event.deliveryId,
          orderId: event.orderId,
        },
      });
    }
  }

  /**
   * Delivery completed — food reached the customer.
   *
   * This triggers the "order complete" UI state:
   * - Customer sees order completion confirmation
   * - Vendor knows the order is fully done
   * - Rider is now ONLINE again (handled by DeliveryService)
   *
   * KEY LEARNING: Notifying both customer AND vendor on completion
   * ===============================================================
   * Customer needs the "Enjoy your meal!" message.
   * Vendor cares because this closes the order in their dashboard
   * and potentially triggers revenue reporting.
   *
   * We use Promise.all() again for parallel lookups.
   *
   * Room target: order:{orderId}
   */
  @OnEvent(NOTIFICATION_EVENTS.DELIVERY_COMPLETED)
  async handleDeliveryCompleted(
    event: DeliveryStatusUpdatedEvent,
  ): Promise<void> {
    this.logger.log(
      `Delivery ${event.deliveryId} completed — broadcasting to order:${event.orderId}`,
    );

    // ── Phase 9: WebSocket real-time broadcast ────────────────────────────────

    this.gateway.server
      .to(`order:${event.orderId}`)
      .emit('delivery:status_updated', {
        deliveryId: event.deliveryId,
        status: event.newStatus,
        message: 'Order delivered! Enjoy your meal.',
        timestamp: event.timestamp,
      });

    // ── Phase 10.3: Persist in-app notifications ──────────────────────────────

    const [customer] = await Promise.all([
      this.customerRepo.findOne({ where: { id: event.customerId } }),
    ]);

    if (customer) {
      await this.notificationService.create({
        userId: customer.userId,
        type: NotificationType.DELIVERY_COMPLETED,
        title: 'Order Delivered!',
        message: 'Your order has been delivered. Enjoy your meal! Don\'t forget to rate your experience.',
        data: {
          deliveryId: event.deliveryId,
          orderId: event.orderId,
        },
      });
    }
  }

  /**
   * Admin cancelled a delivery.
   *
   * The customer and vendor need to know.
   * Admin room gets the full context for audit purposes.
   *
   * Room targets: order:{orderId} + admin
   */
  @OnEvent(NOTIFICATION_EVENTS.DELIVERY_CANCELLED)
  async handleDeliveryCancelled(
    event: DeliveryStatusUpdatedEvent,
  ): Promise<void> {
    this.logger.log(
      `Delivery ${event.deliveryId} cancelled — broadcasting to order:${event.orderId}`,
    );

    // ── Phase 9: WebSocket real-time broadcast ────────────────────────────────

    this.gateway.server
      .to(`order:${event.orderId}`)
      .emit('delivery:status_updated', {
        deliveryId: event.deliveryId,
        status: event.newStatus,
        message: 'Delivery cancelled. Our team will reassign a rider.',
        reason: event.reason,
        timestamp: event.timestamp,
      });

    this.gateway.server.to('admin').emit('delivery:cancelled', {
      deliveryId: event.deliveryId,
      orderId: event.orderId,
      reason: event.reason,
      timestamp: event.timestamp,
    });

    // ── Phase 10.3: Persist in-app notification for the customer ─────────────

    const customer = await this.customerRepo.findOne({
      where: { id: event.customerId },
    });
    if (customer) {
      await this.notificationService.create({
        userId: customer.userId,
        type: NotificationType.SYSTEM,
        title: 'Delivery Issue',
        message: `There was an issue with your delivery. ${event.reason ? `Reason: ${event.reason}. ` : ''}Our team is working to reassign a rider as quickly as possible.`,
        data: {
          deliveryId: event.deliveryId,
          orderId: event.orderId,
          reason: event.reason,
        },
      });
    }
  }
}
