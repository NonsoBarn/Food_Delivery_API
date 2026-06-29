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
var DeliveryEventsListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryEventsListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notifications_gateway_1 = require("../gateways/notifications.gateway");
const notifications_service_1 = require("../notifications.service");
const notification_type_enum_1 = require("../enums/notification-type.enum");
const notification_events_1 = require("../events/notification-events");
const delivery_status_enum_1 = require("../../delivery/enums/delivery-status.enum");
const rider_profile_entity_1 = require("../../users/entities/rider-profile.entity");
const customer_profile_entity_1 = require("../../users/entities/customer-profile.entity");
let DeliveryEventsListener = DeliveryEventsListener_1 = class DeliveryEventsListener {
    gateway;
    notificationService;
    riderRepo;
    customerRepo;
    logger = new common_1.Logger(DeliveryEventsListener_1.name);
    constructor(gateway, notificationService, riderRepo, customerRepo) {
        this.gateway = gateway;
        this.notificationService = notificationService;
        this.riderRepo = riderRepo;
        this.customerRepo = customerRepo;
    }
    async handleDeliveryAssigned(event) {
        this.logger.log(`Broadcasting delivery assignment ${event.deliveryId} to rider:${event.riderId}`);
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
        this.gateway.server
            .to(`order:${event.orderId}`)
            .emit('delivery:status_updated', {
            deliveryId: event.deliveryId,
            status: delivery_status_enum_1.DeliveryStatus.PENDING_ACCEPTANCE,
            message: 'Finding a rider for your order...',
            timestamp: new Date(),
        });
        const rider = await this.riderRepo.findOne({ where: { id: event.riderId } });
        if (rider) {
            const distanceMsg = event.estimatedDistanceKm
                ? ` Distance: ${event.estimatedDistanceKm.toFixed(1)}km.`
                : '';
            await this.notificationService.create({
                userId: rider.userId,
                type: notification_type_enum_1.NotificationType.DELIVERY_ASSIGNED,
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
    async handleDeliveryAccepted(event) {
        this.logger.log(`Delivery ${event.deliveryId} accepted — broadcasting to order:${event.orderId}`);
        this.gateway.server
            .to(`order:${event.orderId}`)
            .emit('delivery:status_updated', {
            deliveryId: event.deliveryId,
            status: event.newStatus,
            message: 'Rider accepted! They are heading to the restaurant.',
            timestamp: event.timestamp,
        });
        const customer = await this.customerRepo.findOne({
            where: { id: event.customerId },
        });
        if (customer) {
            await this.notificationService.create({
                userId: customer.userId,
                type: notification_type_enum_1.NotificationType.DELIVERY_ACCEPTED,
                title: 'Rider Accepted Your Order',
                message: 'A rider has accepted your delivery and is heading to the restaurant to pick up your food.',
                data: {
                    deliveryId: event.deliveryId,
                    orderId: event.orderId,
                },
            });
        }
    }
    handleDeliveryRejected(event) {
        this.logger.log(`Delivery ${event.deliveryId} rejected — broadcasting to order and admin`);
        this.gateway.server
            .to(`order:${event.orderId}`)
            .emit('delivery:status_updated', {
            deliveryId: event.deliveryId,
            status: event.newStatus,
            message: 'Looking for another rider...',
            timestamp: event.timestamp,
        });
        this.gateway.server.to('admin').emit('delivery:rider_rejected', {
            deliveryId: event.deliveryId,
            orderId: event.orderId,
            riderId: event.riderId,
            timestamp: event.timestamp,
        });
    }
    async handleDeliveryPickedUp(event) {
        this.logger.log(`Delivery ${event.deliveryId} picked up — broadcasting to order:${event.orderId}`);
        this.gateway.server
            .to(`order:${event.orderId}`)
            .emit('delivery:status_updated', {
            deliveryId: event.deliveryId,
            status: event.newStatus,
            message: 'Your food has been picked up! Rider is heading to you.',
            timestamp: event.timestamp,
        });
        const customer = await this.customerRepo.findOne({
            where: { id: event.customerId },
        });
        if (customer) {
            await this.notificationService.create({
                userId: customer.userId,
                type: notification_type_enum_1.NotificationType.DELIVERY_PICKED_UP,
                title: 'Food Picked Up!',
                message: 'Your food has been picked up from the restaurant. The rider is now heading to you — track in real time!',
                data: {
                    deliveryId: event.deliveryId,
                    orderId: event.orderId,
                },
            });
        }
    }
    async handleDeliveryCompleted(event) {
        this.logger.log(`Delivery ${event.deliveryId} completed — broadcasting to order:${event.orderId}`);
        this.gateway.server
            .to(`order:${event.orderId}`)
            .emit('delivery:status_updated', {
            deliveryId: event.deliveryId,
            status: event.newStatus,
            message: 'Order delivered! Enjoy your meal.',
            timestamp: event.timestamp,
        });
        const [customer] = await Promise.all([
            this.customerRepo.findOne({ where: { id: event.customerId } }),
        ]);
        if (customer) {
            await this.notificationService.create({
                userId: customer.userId,
                type: notification_type_enum_1.NotificationType.DELIVERY_COMPLETED,
                title: 'Order Delivered!',
                message: 'Your order has been delivered. Enjoy your meal! Don\'t forget to rate your experience.',
                data: {
                    deliveryId: event.deliveryId,
                    orderId: event.orderId,
                },
            });
        }
    }
    async handleDeliveryCancelled(event) {
        this.logger.log(`Delivery ${event.deliveryId} cancelled — broadcasting to order:${event.orderId}`);
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
        const customer = await this.customerRepo.findOne({
            where: { id: event.customerId },
        });
        if (customer) {
            await this.notificationService.create({
                userId: customer.userId,
                type: notification_type_enum_1.NotificationType.SYSTEM,
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
};
exports.DeliveryEventsListener = DeliveryEventsListener;
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_ASSIGNED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveryEventsListener.prototype, "handleDeliveryAssigned", null);
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_ACCEPTED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveryEventsListener.prototype, "handleDeliveryAccepted", null);
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_REJECTED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DeliveryEventsListener.prototype, "handleDeliveryRejected", null);
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_PICKED_UP),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveryEventsListener.prototype, "handleDeliveryPickedUp", null);
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_COMPLETED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveryEventsListener.prototype, "handleDeliveryCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_CANCELLED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveryEventsListener.prototype, "handleDeliveryCancelled", null);
exports.DeliveryEventsListener = DeliveryEventsListener = DeliveryEventsListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(rider_profile_entity_1.RiderProfile)),
    __param(3, (0, typeorm_1.InjectRepository)(customer_profile_entity_1.CustomerProfile)),
    __metadata("design:paramtypes", [notifications_gateway_1.NotificationsGateway,
        notifications_service_1.NotificationService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], DeliveryEventsListener);
//# sourceMappingURL=delivery-events.listener.js.map