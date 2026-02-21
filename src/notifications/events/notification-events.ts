/**
 * Notification Event Interfaces
 *
 * These interfaces define the "shape" of data that flows through the
 * in-process event bus (@nestjs/event-emitter) between:
 *   - Services (that fire events after DB writes)
 *   - Listeners (that receive events and broadcast to WebSocket clients)
 *
 * KEY LEARNING: Why Typed Event Payloads?
 * =========================================
 * Without types, you'd pass arbitrary objects and discover mismatches at runtime.
 * With types, TypeScript catches mismatches at compile time:
 *
 *   eventEmitter.emit('order.created', { orderId: 123 })  // ← TypeScript error!
 *   // OrderCreatedEvent.orderId must be a string (UUID), not a number
 *
 * Think of these interfaces as "API contracts" between modules.
 * The emitter must produce exactly this shape; the listener can rely on it.
 *
 * KEY LEARNING: Event Name Conventions
 * ======================================
 * We use dot-notation: 'order.created', 'delivery.status.updated'
 * This is the convention for @nestjs/event-emitter.
 * The delimiter '.' is configured in EventEmitterModule.forRoot({ delimiter: '.' }).
 *
 * Centralizing all event name constants here prevents typos:
 *   eventEmitter.emit('orer.created', ...)  // ← typo, nothing listens
 *
 * With NOTIFICATION_EVENTS.ORDER_CREATED, TypeScript ensures you use
 * the same string everywhere.
 */

import { OrderStatus } from '../../orders/enums/order-status.enum';
import { DeliveryStatus } from '../../delivery/enums/delivery-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';

// ==================== EVENT NAME CONSTANTS ====================

/**
 * Centralized event name registry.
 *
 * Using constants prevents silent bugs from typos.
 * If you mistype NOTIFICATION_EVENTS.ORDER_CRATED TypeScript complains.
 * If you mistype the string 'order.crated' nothing catches it.
 */
export const NOTIFICATION_EVENTS = {
  // Order lifecycle events
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_UPDATED: 'order.status.updated',

  // Delivery lifecycle events
  DELIVERY_ASSIGNED: 'delivery.assigned',
  DELIVERY_ACCEPTED: 'delivery.accepted',
  DELIVERY_REJECTED: 'delivery.rejected',
  DELIVERY_PICKED_UP: 'delivery.picked_up',
  DELIVERY_COMPLETED: 'delivery.completed',
  DELIVERY_CANCELLED: 'delivery.cancelled',
} as const;

// ==================== ORDER EVENT PAYLOADS ====================

/**
 * Fired when a customer creates a new order.
 *
 * The vendor needs to be notified immediately so they can confirm or reject.
 * This event is emitted by OrdersService.createOrder() after the DB transaction
 * commits — one event PER order (multi-vendor checkouts emit multiple events).
 */
export interface OrderCreatedEvent {
  orderId: string;
  orderNumber: string; // Human-readable: "ORD-20260221-A3F8K2"
  orderGroupId: string; // Groups multi-vendor orders from one checkout
  customerId: string; // CustomerProfile.id
  vendorProfileId: string; // VendorProfile.id — who to notify
  total: number;
  itemCount: number;
  createdAt: Date;
}

/**
 * Fired when any order status changes.
 *
 * One event covers ALL transitions (PENDING→CONFIRMED, CONFIRMED→PREPARING, etc.)
 * Listeners can filter by newStatus if they only care about specific transitions.
 *
 * Emitted by:
 * - OrdersService.updateOrderStatus() — for vendor-driven transitions
 * - DeliveryService.pickUpDelivery() — syncs order to PICKED_UP
 * - DeliveryService.completeDelivery() — syncs order to DELIVERED
 */
export interface OrderStatusUpdatedEvent {
  orderId: string;
  orderNumber: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  customerId: string; // CustomerProfile.id
  vendorProfileId: string; // VendorProfile.id
  riderId?: string; // RiderProfile.id — only set when a rider is involved
  updatedBy: UserRole; // Who triggered this change
  timestamp: Date;

  // Optional context fields (set for specific transitions)
  estimatedPrepTimeMinutes?: number; // Set when vendor confirms
  cancellationReason?: string; // Set when cancelled
}

// ==================== DELIVERY EVENT PAYLOADS ====================

/**
 * Fired when an order is assigned to a rider.
 *
 * The rider needs an immediate WebSocket push to their device
 * so they can accept or reject the delivery.
 *
 * Emitted by DeliveryService.assignOrderToRider()
 */
export interface DeliveryAssignedEvent {
  deliveryId: string;
  orderId: string;
  orderNumber: string;
  riderId: string; // RiderProfile.id — who to notify
  customerId: string; // CustomerProfile.id
  vendorProfileId: string; // VendorProfile.id
  assignmentType: 'MANUAL' | 'AUTO';
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  estimatedDistanceKm?: number;
  estimatedDurationMinutes?: number;
}

/**
 * Generic delivery status change event.
 *
 * Covers: ACCEPTED, REJECTED, PICKED_UP, DELIVERED, CANCELLED
 * Used to broadcast delivery progress to the order room
 * (which customer + vendor join when viewing an order).
 *
 * Emitted by DeliveryService after each status transition.
 */
export interface DeliveryStatusUpdatedEvent {
  deliveryId: string;
  orderId: string;
  riderId: string;
  customerId: string;
  vendorProfileId: string;
  previousStatus: DeliveryStatus;
  newStatus: DeliveryStatus;
  timestamp: Date;

  // Optional: set when rider rejects or delivery is cancelled
  reason?: string;
}

// ==================== LOCATION EVENT PAYLOAD ====================

/**
 * Rider real-time location update.
 *
 * NOT emitted via EventEmitter (too high frequency — riders update every 5s).
 * Instead, this payload is used directly inside the gateway's
 * @SubscribeMessage('rider:location:update') handler.
 *
 * The rider sends this from their app → gateway stores in Redis GEO
 * → gateway broadcasts to the customer's socket in the order room.
 */
export interface RiderLocationUpdatePayload {
  latitude: number;
  longitude: number;
  heading?: number; // Direction of travel (0-360 degrees)
  speed?: number; // Speed in km/h
}
