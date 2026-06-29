"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrderEventsListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderEventsListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notifications_gateway_1 = require("../gateways/notifications.gateway");
const notifications_service_1 = require("../notifications.service");
const notification_type_enum_1 = require("../enums/notification-type.enum");
const notification_events_1 = require("../events/notification-events");
const order_status_enum_1 = require("../../orders/enums/order-status.enum");
const customer_profile_entity_1 = require("../../users/entities/customer-profile.entity");
const vendor_profile_entity_1 = require("../../users/entities/vendor-profile.entity");
let OrderEventsListener = OrderEventsListener_1 = class OrderEventsListener {
    gateway;
    notificationService;
    customerRepo;
    vendorRepo;
    logger = new common_1.Logger(OrderEventsListener_1.name);
    constructor(gateway, notificationService, customerRepo, vendorRepo) {
        this.gateway = gateway;
        this.notificationService = notificationService;
        this.customerRepo = customerRepo;
        this.vendorRepo = vendorRepo;
    }
    async handleOrderCreated(event) {
        this.logger.log(`Broadcasting new order ${event.orderNumber} to vendor:${event.vendorProfileId}`);
        this.gateway.server
            .to(`vendor:${event.vendorProfileId}`)
            .emit('order:new', {
            orderId: event.orderId,
            orderNumber: event.orderNumber,
            total: event.total,
            itemCount: event.itemCount,
            createdAt: event.createdAt,
        });
        this.gateway.server.to('admin').emit('order:new', event);
        const [vendor, customer] = await Promise.all([
            this.vendorRepo.findOne({ where: { id: event.vendorProfileId } }),
            this.customerRepo.findOne({ where: { id: event.customerId } }),
        ]);
        if (vendor) {
            await this.notificationService.create({
                userId: vendor.userId,
                type: notification_type_enum_1.NotificationType.ORDER_CREATED,
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
        if (customer) {
            await this.notificationService.create({
                userId: customer.userId,
                type: notification_type_enum_1.NotificationType.ORDER_CREATED,
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
    async handleOrderStatusUpdated(event) {
        this.logger.log(`Broadcasting order ${event.orderNumber} status: ${event.previousStatus} → ${event.newStatus}`);
        const socketEvent = this.buildStatusUpdatePayload(event);
        this.gateway.server
            .to(`order:${event.orderId}`)
            .emit('order:status_updated', socketEvent);
        if (event.newStatus === order_status_enum_1.OrderStatus.CANCELLED) {
            this.gateway.server.to('admin').emit('order:cancelled', {
                orderId: event.orderId,
                orderNumber: event.orderNumber,
                reason: event.cancellationReason,
                cancelledBy: event.updatedBy,
            });
        }
        const content = this.buildStatusNotificationContent(event);
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
        if (event.newStatus === order_status_enum_1.OrderStatus.CANCELLED && event.vendorProfileId) {
            const vendor = await this.vendorRepo.findOne({
                where: { id: event.vendorProfileId },
            });
            if (vendor) {
                await this.notificationService.create({
                    userId: vendor.userId,
                    type: notification_type_enum_1.NotificationType.ORDER_CANCELLED,
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
    buildStatusUpdatePayload(event) {
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
    buildStatusNotificationContent(event) {
        const { orderNumber, newStatus, estimatedPrepTimeMinutes } = event;
        switch (newStatus) {
            case order_status_enum_1.OrderStatus.CONFIRMED:
                return {
                    type: notification_type_enum_1.NotificationType.ORDER_CONFIRMED,
                    title: `Order Confirmed: ${orderNumber}`,
                    message: estimatedPrepTimeMinutes
                        ? `Your order has been confirmed! Estimated prep time: ${estimatedPrepTimeMinutes} minutes.`
                        : `Your order has been confirmed by the restaurant!`,
                };
            case order_status_enum_1.OrderStatus.PREPARING:
                return {
                    type: notification_type_enum_1.NotificationType.ORDER_PREPARING,
                    title: `Order Being Prepared: ${orderNumber}`,
                    message: `The kitchen has started preparing your order. Hang tight!`,
                };
            case order_status_enum_1.OrderStatus.READY_FOR_PICKUP:
                return {
                    type: notification_type_enum_1.NotificationType.ORDER_READY,
                    title: `Order Ready: ${orderNumber}`,
                    message: `Your order is packed and ready! A rider is being assigned.`,
                };
            case order_status_enum_1.OrderStatus.CANCELLED:
                return {
                    type: notification_type_enum_1.NotificationType.ORDER_CANCELLED,
                    title: `Order Cancelled: ${orderNumber}`,
                    message: event.cancellationReason
                        ? `Your order has been cancelled. Reason: ${event.cancellationReason}`
                        : `Your order has been cancelled.`,
                };
            default:
                return null;
        }
    }
};
exports.OrderEventsListener = OrderEventsListener;
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.ORDER_CREATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderEventsListener.prototype, "handleOrderCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.ORDER_STATUS_UPDATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderEventsListener.prototype, "handleOrderStatusUpdated", null);
exports.OrderEventsListener = OrderEventsListener = OrderEventsListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(customer_profile_entity_1.CustomerProfile)),
    __param(3, (0, typeorm_1.InjectRepository)(vendor_profile_entity_1.VendorProfile)),
    __metadata("design:paramtypes", [notifications_gateway_1.NotificationsGateway,
        notifications_service_1.NotificationService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], OrderEventsListener);
//# sourceMappingURL=order-events.listener.js.map