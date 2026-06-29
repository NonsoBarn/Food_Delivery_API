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
var DeliveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const delivery_entity_1 = require("../entities/delivery.entity");
const order_entity_1 = require("../../orders/entities/order.entity");
const rider_profile_entity_1 = require("../../users/entities/rider-profile.entity");
const delivery_status_enum_1 = require("../enums/delivery-status.enum");
const assignment_type_enum_1 = require("../enums/assignment-type.enum");
const order_status_enum_1 = require("../../orders/enums/order-status.enum");
const order_status_machine_1 = require("../../orders/order-status-machine");
const storage_factory_service_1 = require("../../storage/storage-factory.service");
const rider_location_service_1 = require("./rider-location.service");
const notification_events_1 = require("../../notifications/events/notification-events");
let DeliveryService = DeliveryService_1 = class DeliveryService {
    deliveryRepository;
    orderRepository;
    riderRepository;
    dataSource;
    storageFactory;
    riderLocationService;
    eventEmitter;
    logger = new common_1.Logger(DeliveryService_1.name);
    constructor(deliveryRepository, orderRepository, riderRepository, dataSource, storageFactory, riderLocationService, eventEmitter) {
        this.deliveryRepository = deliveryRepository;
        this.orderRepository = orderRepository;
        this.riderRepository = riderRepository;
        this.dataSource = dataSource;
        this.storageFactory = storageFactory;
        this.riderLocationService = riderLocationService;
        this.eventEmitter = eventEmitter;
    }
    async assignOrderToRider(orderId, riderId, adminUserId, assignmentType) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order "${orderId}" not found`);
        }
        if (order.status !== order_status_enum_1.OrderStatus.READY_FOR_PICKUP) {
            throw new common_1.BadRequestException(`Order must be in "ready_for_pickup" status to assign a rider. Current status: "${order.status}"`);
        }
        const existingDelivery = await this.deliveryRepository.findOne({
            where: {
                orderId,
                status: (0, typeorm_2.In)([
                    delivery_status_enum_1.DeliveryStatus.PENDING_ACCEPTANCE,
                    delivery_status_enum_1.DeliveryStatus.ACCEPTED,
                    delivery_status_enum_1.DeliveryStatus.PICKED_UP,
                ]),
            },
        });
        if (existingDelivery) {
            throw new common_1.ConflictException(`Order already has an active delivery (ID: ${existingDelivery.id}, status: ${existingDelivery.status})`);
        }
        const rider = await this.riderRepository.findOne({
            where: { id: riderId },
        });
        if (!rider) {
            throw new common_1.NotFoundException(`Rider "${riderId}" not found`);
        }
        if (rider.status !== rider_profile_entity_1.RiderStatus.APPROVED) {
            throw new common_1.BadRequestException(`Rider is not approved. Current status: "${rider.status}"`);
        }
        if (rider.availabilityStatus !== rider_profile_entity_1.AvailabilityStatus.ONLINE) {
            throw new common_1.BadRequestException(`Rider is not online. Current availability: "${rider.availabilityStatus}"`);
        }
        const riderActiveDelivery = await this.deliveryRepository.findOne({
            where: {
                riderId,
                status: (0, typeorm_2.In)([
                    delivery_status_enum_1.DeliveryStatus.PENDING_ACCEPTANCE,
                    delivery_status_enum_1.DeliveryStatus.ACCEPTED,
                    delivery_status_enum_1.DeliveryStatus.PICKED_UP,
                ]),
            },
        });
        if (riderActiveDelivery) {
            throw new common_1.ConflictException(`Rider already has an active delivery (ID: ${riderActiveDelivery.id})`);
        }
        const delivery = this.deliveryRepository.create({
            orderId,
            riderId,
            assignmentType,
            assignedBy: assignmentType === assignment_type_enum_1.AssignmentType.MANUAL ? adminUserId ?? undefined : undefined,
            dropoffLatitude: order.deliveryLatitude,
            dropoffLongitude: order.deliveryLongitude,
        });
        rider.availabilityStatus = rider_profile_entity_1.AvailabilityStatus.BUSY;
        const savedDelivery = await this.dataSource.transaction(async (manager) => {
            const saved = await manager.getRepository(delivery_entity_1.Delivery).save(delivery);
            await manager.getRepository(rider_profile_entity_1.RiderProfile).save(rider);
            this.logger.log(`Order ${orderId} assigned to rider ${riderId} (${assignmentType})`);
            return saved;
        });
        const assignedEvent = {
            deliveryId: savedDelivery.id,
            orderId,
            orderNumber: order.orderNumber ?? '',
            riderId,
            customerId: order.customerId,
            vendorProfileId: order.vendorId,
            assignmentType: assignmentType === assignment_type_enum_1.AssignmentType.MANUAL ? 'MANUAL' : 'AUTO',
            dropoffLatitude: delivery.dropoffLatitude
                ? Number(delivery.dropoffLatitude)
                : undefined,
            dropoffLongitude: delivery.dropoffLongitude
                ? Number(delivery.dropoffLongitude)
                : undefined,
        };
        this.eventEmitter.emit(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_ASSIGNED, assignedEvent);
        return savedDelivery;
    }
    async acceptDelivery(deliveryId, riderProfileId) {
        const delivery = await this.findDeliveryForRider(deliveryId, riderProfileId);
        if (delivery.status !== delivery_status_enum_1.DeliveryStatus.PENDING_ACCEPTANCE) {
            throw new common_1.BadRequestException(`Cannot accept a delivery with status "${delivery.status}". Must be "pending_acceptance".`);
        }
        const saved = await this.dataSource.transaction(async (manager) => {
            delivery.status = delivery_status_enum_1.DeliveryStatus.ACCEPTED;
            delivery.acceptedAt = new Date();
            const result = await manager.save(delivery_entity_1.Delivery, delivery);
            await manager.update(order_entity_1.Order, delivery.orderId, {
                riderId: riderProfileId,
            });
            this.logger.log(`Delivery ${deliveryId} accepted by rider ${riderProfileId}`);
            return result;
        });
        this.eventEmitter.emit(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_ACCEPTED, {
            deliveryId,
            orderId: saved.orderId,
            riderId: riderProfileId,
            customerId: '',
            vendorProfileId: '',
            previousStatus: delivery_status_enum_1.DeliveryStatus.PENDING_ACCEPTANCE,
            newStatus: delivery_status_enum_1.DeliveryStatus.ACCEPTED,
            timestamp: new Date(),
        });
        return saved;
    }
    async rejectDelivery(deliveryId, riderProfileId) {
        const delivery = await this.findDeliveryForRider(deliveryId, riderProfileId);
        if (delivery.status !== delivery_status_enum_1.DeliveryStatus.PENDING_ACCEPTANCE) {
            throw new common_1.BadRequestException(`Cannot reject a delivery with status "${delivery.status}". Must be "pending_acceptance".`);
        }
        const saved = await this.dataSource.transaction(async (manager) => {
            delivery.status = delivery_status_enum_1.DeliveryStatus.REJECTED;
            delivery.rejectedAt = new Date();
            const result = await manager.save(delivery_entity_1.Delivery, delivery);
            await manager.update(rider_profile_entity_1.RiderProfile, riderProfileId, {
                availabilityStatus: rider_profile_entity_1.AvailabilityStatus.ONLINE,
            });
            this.logger.log(`Delivery ${deliveryId} rejected by rider ${riderProfileId}`);
            return result;
        });
        this.eventEmitter.emit(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_REJECTED, {
            deliveryId,
            orderId: saved.orderId,
            riderId: riderProfileId,
            customerId: '',
            vendorProfileId: '',
            previousStatus: delivery_status_enum_1.DeliveryStatus.PENDING_ACCEPTANCE,
            newStatus: delivery_status_enum_1.DeliveryStatus.REJECTED,
            timestamp: new Date(),
        });
        return saved;
    }
    async pickUpDelivery(deliveryId, riderProfileId) {
        const delivery = await this.findDeliveryForRider(deliveryId, riderProfileId);
        if (delivery.status !== delivery_status_enum_1.DeliveryStatus.ACCEPTED) {
            throw new common_1.BadRequestException(`Cannot pick up. Delivery status must be "accepted", got "${delivery.status}".`);
        }
        const order = await this.orderRepository.findOne({
            where: { id: delivery.orderId },
        });
        if (!order || !(0, order_status_machine_1.canTransition)(order.status, order_status_enum_1.OrderStatus.PICKED_UP)) {
            throw new common_1.BadRequestException(`Order cannot transition to "picked_up". Current order status: "${order?.status}"`);
        }
        const saved = await this.dataSource.transaction(async (manager) => {
            delivery.status = delivery_status_enum_1.DeliveryStatus.PICKED_UP;
            delivery.pickedUpAt = new Date();
            const result = await manager.save(delivery_entity_1.Delivery, delivery);
            order.status = order_status_enum_1.OrderStatus.PICKED_UP;
            order.pickedUpAt = new Date();
            await manager.save(order_entity_1.Order, order);
            this.logger.log(`Delivery ${deliveryId}: food picked up by rider ${riderProfileId}`);
            return result;
        });
        this.eventEmitter.emit(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_PICKED_UP, {
            deliveryId,
            orderId: saved.orderId,
            riderId: riderProfileId,
            customerId: order.customerId,
            vendorProfileId: order.vendorId,
            previousStatus: delivery_status_enum_1.DeliveryStatus.ACCEPTED,
            newStatus: delivery_status_enum_1.DeliveryStatus.PICKED_UP,
            timestamp: new Date(),
        });
        return saved;
    }
    async completeDelivery(deliveryId, riderProfileId, proofImage, notes) {
        const delivery = await this.findDeliveryForRider(deliveryId, riderProfileId);
        if (delivery.status !== delivery_status_enum_1.DeliveryStatus.PICKED_UP) {
            throw new common_1.BadRequestException(`Cannot complete. Delivery status must be "picked_up", got "${delivery.status}".`);
        }
        const order = await this.orderRepository.findOne({
            where: { id: delivery.orderId },
        });
        if (!order || !(0, order_status_machine_1.canTransition)(order.status, order_status_enum_1.OrderStatus.DELIVERED)) {
            throw new common_1.BadRequestException(`Order cannot transition to "delivered". Current order status: "${order?.status}"`);
        }
        let proofUrl = null;
        if (proofImage) {
            try {
                const storageService = this.storageFactory.getStorageService('image');
                const result = await storageService.upload(proofImage, {
                    folder: 'delivery-proofs',
                    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
                    maxSizeBytes: 5 * 1024 * 1024,
                });
                proofUrl = result.url;
            }
            catch (error) {
                this.logger.warn(`Failed to upload proof image for delivery ${deliveryId}: ${error.message}`);
            }
        }
        const saved = await this.dataSource.transaction(async (manager) => {
            delivery.status = delivery_status_enum_1.DeliveryStatus.DELIVERED;
            delivery.deliveredAt = new Date();
            if (proofUrl)
                delivery.proofOfDeliveryUrl = proofUrl;
            if (notes)
                delivery.deliveryNotes = notes;
            const result = await manager.save(delivery_entity_1.Delivery, delivery);
            order.status = order_status_enum_1.OrderStatus.DELIVERED;
            order.deliveredAt = new Date();
            await manager.save(order_entity_1.Order, order);
            await manager
                .createQueryBuilder()
                .update(rider_profile_entity_1.RiderProfile)
                .set({
                availabilityStatus: rider_profile_entity_1.AvailabilityStatus.ONLINE,
                totalDeliveries: () => '"totalDeliveries" + 1',
            })
                .where('id = :id', { id: riderProfileId })
                .execute();
            this.logger.log(`Delivery ${deliveryId} completed by rider ${riderProfileId}`);
            return result;
        });
        this.eventEmitter.emit(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_COMPLETED, {
            deliveryId,
            orderId: saved.orderId,
            riderId: riderProfileId,
            customerId: order.customerId,
            vendorProfileId: order.vendorId,
            previousStatus: delivery_status_enum_1.DeliveryStatus.PICKED_UP,
            newStatus: delivery_status_enum_1.DeliveryStatus.DELIVERED,
            timestamp: new Date(),
        });
        return saved;
    }
    async cancelDelivery(deliveryId, adminUserId, reason) {
        const delivery = await this.deliveryRepository.findOne({
            where: { id: deliveryId },
        });
        if (!delivery) {
            throw new common_1.NotFoundException(`Delivery "${deliveryId}" not found`);
        }
        const cancellableStatuses = [
            delivery_status_enum_1.DeliveryStatus.PENDING_ACCEPTANCE,
            delivery_status_enum_1.DeliveryStatus.ACCEPTED,
            delivery_status_enum_1.DeliveryStatus.PICKED_UP,
        ];
        if (!cancellableStatuses.includes(delivery.status)) {
            throw new common_1.BadRequestException(`Cannot cancel a delivery with status "${delivery.status}"`);
        }
        const previousStatus = delivery.status;
        const saved = await this.dataSource.transaction(async (manager) => {
            delivery.status = delivery_status_enum_1.DeliveryStatus.CANCELLED;
            delivery.cancelledAt = new Date();
            delivery.cancellationReason = reason;
            const result = await manager.save(delivery_entity_1.Delivery, delivery);
            await manager.update(rider_profile_entity_1.RiderProfile, delivery.riderId, {
                availabilityStatus: rider_profile_entity_1.AvailabilityStatus.ONLINE,
            });
            this.logger.log(`Delivery ${deliveryId} cancelled by admin ${adminUserId}. Reason: ${reason}`);
            return result;
        });
        this.eventEmitter.emit(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_CANCELLED, {
            deliveryId,
            orderId: saved.orderId,
            riderId: saved.riderId,
            customerId: '',
            vendorProfileId: '',
            previousStatus,
            newStatus: delivery_status_enum_1.DeliveryStatus.CANCELLED,
            reason,
            timestamp: new Date(),
        });
        return saved;
    }
    async autoAssignOrder(orderId) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order "${orderId}" not found`);
        }
        if (order.status !== order_status_enum_1.OrderStatus.READY_FOR_PICKUP) {
            throw new common_1.BadRequestException(`Order must be "ready_for_pickup" for auto-assignment. Current: "${order.status}"`);
        }
        if (!order.deliveryLatitude || !order.deliveryLongitude) {
            throw new common_1.BadRequestException('Order does not have delivery coordinates. Cannot auto-assign.');
        }
        const nearbyRiders = await this.riderLocationService.findNearestRiders(Number(order.deliveryLatitude), Number(order.deliveryLongitude), 10, 5);
        if (nearbyRiders.length === 0) {
            this.logger.warn(`No nearby riders found for order ${orderId}. Manual assignment needed.`);
            return null;
        }
        for (const candidate of nearbyRiders) {
            const activeDelivery = await this.deliveryRepository.findOne({
                where: {
                    riderId: candidate.riderId,
                    status: (0, typeorm_2.In)([
                        delivery_status_enum_1.DeliveryStatus.PENDING_ACCEPTANCE,
                        delivery_status_enum_1.DeliveryStatus.ACCEPTED,
                        delivery_status_enum_1.DeliveryStatus.PICKED_UP,
                    ]),
                },
            });
            if (activeDelivery) {
                continue;
            }
            try {
                const delivery = await this.assignOrderToRider(orderId, candidate.riderId, null, assignment_type_enum_1.AssignmentType.AUTO);
                this.logger.log(`Auto-assigned order ${orderId} to rider ${candidate.riderId} (${candidate.distanceKm.toFixed(1)}km away)`);
                return delivery;
            }
            catch (error) {
                this.logger.warn(`Failed to auto-assign rider ${candidate.riderId}: ${error.message}`);
                continue;
            }
        }
        this.logger.warn(`All nearby riders are busy for order ${orderId}. Manual assignment needed.`);
        return null;
    }
    async findDeliveryByOrder(orderId) {
        return this.deliveryRepository.findOne({
            where: {
                orderId,
                status: (0, typeorm_2.In)([
                    delivery_status_enum_1.DeliveryStatus.PENDING_ACCEPTANCE,
                    delivery_status_enum_1.DeliveryStatus.ACCEPTED,
                    delivery_status_enum_1.DeliveryStatus.PICKED_UP,
                    delivery_status_enum_1.DeliveryStatus.DELIVERED,
                ]),
            },
            relations: ['rider', 'order'],
        });
    }
    async findActiveDeliveryForRider(riderId) {
        return this.deliveryRepository.findOne({
            where: {
                riderId,
                status: (0, typeorm_2.In)([
                    delivery_status_enum_1.DeliveryStatus.PENDING_ACCEPTANCE,
                    delivery_status_enum_1.DeliveryStatus.ACCEPTED,
                    delivery_status_enum_1.DeliveryStatus.PICKED_UP,
                ]),
            },
            relations: ['order'],
        });
    }
    async getDeliveryDetails(deliveryId) {
        const delivery = await this.deliveryRepository.findOne({
            where: { id: deliveryId },
            relations: ['order', 'rider'],
        });
        if (!delivery) {
            throw new common_1.NotFoundException(`Delivery "${deliveryId}" not found`);
        }
        return delivery;
    }
    async findDeliveryForRider(deliveryId, riderProfileId) {
        const delivery = await this.deliveryRepository.findOne({
            where: { id: deliveryId },
        });
        if (!delivery) {
            throw new common_1.NotFoundException(`Delivery "${deliveryId}" not found`);
        }
        if (delivery.riderId !== riderProfileId) {
            throw new common_1.BadRequestException('This delivery is not assigned to you');
        }
        return delivery;
    }
};
exports.DeliveryService = DeliveryService;
exports.DeliveryService = DeliveryService = DeliveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(delivery_entity_1.Delivery)),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(2, (0, typeorm_1.InjectRepository)(rider_profile_entity_1.RiderProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        storage_factory_service_1.StorageFactoryService,
        rider_location_service_1.RiderLocationService,
        event_emitter_1.EventEmitter2])
], DeliveryService);
//# sourceMappingURL=delivery.service.js.map