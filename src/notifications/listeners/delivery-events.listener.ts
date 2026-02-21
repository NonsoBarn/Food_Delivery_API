/**
 * DeliveryEventsListener
 *
 * Listens for delivery lifecycle events from DeliveryService and broadcasts
 * the right notifications to the right clients.
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
 *
 * Each class has ONE clear responsibility.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { NOTIFICATION_EVENTS } from '../events/notification-events';
import type {
  DeliveryAssignedEvent,
  DeliveryStatusUpdatedEvent,
} from '../events/notification-events';
import { DeliveryStatus } from '../../delivery/enums/delivery-status.enum';

@Injectable()
export class DeliveryEventsListener {
  private readonly logger = new Logger(DeliveryEventsListener.name);

  constructor(private readonly gateway: NotificationsGateway) {}

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
   * Room target: rider:{riderId}
   *   The rider's socket joined this room on connect (see gateway.joinRoleRooms).
   *   If the rider has multiple devices, all of them receive the notification.
   */
  @OnEvent(NOTIFICATION_EVENTS.DELIVERY_ASSIGNED)
  handleDeliveryAssigned(event: DeliveryAssignedEvent): void {
    this.logger.log(
      `Broadcasting delivery assignment ${event.deliveryId} to rider:${event.riderId}`,
    );

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
  handleDeliveryAccepted(event: DeliveryStatusUpdatedEvent): void {
    this.logger.log(
      `Delivery ${event.deliveryId} accepted — broadcasting to order:${event.orderId}`,
    );

    this.gateway.server
      .to(`order:${event.orderId}`)
      .emit('delivery:status_updated', {
        deliveryId: event.deliveryId,
        status: event.newStatus,
        message: 'Rider accepted! They are heading to the restaurant.',
        timestamp: event.timestamp,
      });
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
  handleDeliveryPickedUp(event: DeliveryStatusUpdatedEvent): void {
    this.logger.log(
      `Delivery ${event.deliveryId} picked up — broadcasting to order:${event.orderId}`,
    );

    this.gateway.server
      .to(`order:${event.orderId}`)
      .emit('delivery:status_updated', {
        deliveryId: event.deliveryId,
        status: event.newStatus,
        message: 'Your food has been picked up! Rider is heading to you.',
        timestamp: event.timestamp,
      });
  }

  /**
   * Delivery completed — food reached the customer.
   *
   * This triggers the "order complete" UI state:
   * - Customer sees order completion confirmation
   * - Vendor knows the order is fully done
   * - Rider is now ONLINE again (handled by DeliveryService)
   *
   * Room target: order:{orderId}
   */
  @OnEvent(NOTIFICATION_EVENTS.DELIVERY_COMPLETED)
  handleDeliveryCompleted(event: DeliveryStatusUpdatedEvent): void {
    this.logger.log(
      `Delivery ${event.deliveryId} completed — broadcasting to order:${event.orderId}`,
    );

    this.gateway.server
      .to(`order:${event.orderId}`)
      .emit('delivery:status_updated', {
        deliveryId: event.deliveryId,
        status: event.newStatus,
        message: 'Order delivered! Enjoy your meal.',
        timestamp: event.timestamp,
      });
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
  handleDeliveryCancelled(event: DeliveryStatusUpdatedEvent): void {
    this.logger.log(
      `Delivery ${event.deliveryId} cancelled — broadcasting to order:${event.orderId}`,
    );

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
  }
}
