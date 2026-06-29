import { OrderStatus } from '../../orders/enums/order-status.enum';
import { DeliveryStatus } from '../../delivery/enums/delivery-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
export declare const NOTIFICATION_EVENTS: {
    readonly USER_REGISTERED: "user.registered";
    readonly ORDER_CREATED: "order.created";
    readonly ORDER_STATUS_UPDATED: "order.status.updated";
    readonly DELIVERY_ASSIGNED: "delivery.assigned";
    readonly DELIVERY_ACCEPTED: "delivery.accepted";
    readonly DELIVERY_REJECTED: "delivery.rejected";
    readonly DELIVERY_PICKED_UP: "delivery.picked_up";
    readonly DELIVERY_COMPLETED: "delivery.completed";
    readonly DELIVERY_CANCELLED: "delivery.cancelled";
};
export interface UserRegisteredEvent {
    userId: string;
    email: string;
    role: string;
}
export interface OrderCreatedEvent {
    orderId: string;
    orderNumber: string;
    orderGroupId: string;
    customerId: string;
    vendorProfileId: string;
    total: number;
    itemCount: number;
    createdAt: Date;
}
export interface OrderStatusUpdatedEvent {
    orderId: string;
    orderNumber: string;
    previousStatus: OrderStatus;
    newStatus: OrderStatus;
    customerId: string;
    vendorProfileId: string;
    riderId?: string;
    updatedBy: UserRole;
    timestamp: Date;
    estimatedPrepTimeMinutes?: number;
    cancellationReason?: string;
}
export interface DeliveryAssignedEvent {
    deliveryId: string;
    orderId: string;
    orderNumber: string;
    riderId: string;
    customerId: string;
    vendorProfileId: string;
    assignmentType: 'MANUAL' | 'AUTO';
    pickupLatitude?: number;
    pickupLongitude?: number;
    dropoffLatitude?: number;
    dropoffLongitude?: number;
    estimatedDistanceKm?: number;
    estimatedDurationMinutes?: number;
}
export interface DeliveryStatusUpdatedEvent {
    deliveryId: string;
    orderId: string;
    riderId: string;
    customerId: string;
    vendorProfileId: string;
    previousStatus: DeliveryStatus;
    newStatus: DeliveryStatus;
    timestamp: Date;
    reason?: string;
}
export interface RiderLocationUpdatePayload {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
}
