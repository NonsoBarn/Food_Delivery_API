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
var CommunicationEventsListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationEventsListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const mail_service_1 = require("../mail/mail.service");
const sms_service_1 = require("../sms/sms.service");
const customer_profile_entity_1 = require("../../users/entities/customer-profile.entity");
const vendor_profile_entity_1 = require("../../users/entities/vendor-profile.entity");
const order_entity_1 = require("../../orders/entities/order.entity");
const notification_events_1 = require("../../notifications/events/notification-events");
const order_status_enum_1 = require("../../orders/enums/order-status.enum");
const delivery_status_enum_1 = require("../../delivery/enums/delivery-status.enum");
let CommunicationEventsListener = CommunicationEventsListener_1 = class CommunicationEventsListener {
    mailService;
    smsService;
    customerRepo;
    vendorRepo;
    orderRepo;
    logger = new common_1.Logger(CommunicationEventsListener_1.name);
    constructor(mailService, smsService, customerRepo, vendorRepo, orderRepo) {
        this.mailService = mailService;
        this.smsService = smsService;
        this.customerRepo = customerRepo;
        this.vendorRepo = vendorRepo;
        this.orderRepo = orderRepo;
    }
    async handleUserRegistered(event) {
        try {
            await this.mailService.queueWelcomeEmail(event.email, event.role);
        }
        catch (error) {
            this.logger.error(`Failed to queue welcome email for ${event.email}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async handleOrderCreated(event) {
        try {
            const customer = await this.customerRepo.findOne({
                where: { id: event.customerId },
                relations: ['user'],
            });
            if (!customer?.user) {
                this.logger.warn(`handleOrderCreated: customer ${event.customerId} not found`);
                return;
            }
            const vendor = await this.vendorRepo.findOne({
                where: { id: event.vendorProfileId },
            });
            const order = await this.orderRepo.findOne({
                where: { id: event.orderId },
            });
            await this.mailService.queueOrderConfirmationEmail({
                to: customer.user.email,
                orderNumber: event.orderNumber,
                total: event.total,
                itemCount: event.itemCount,
                vendorName: vendor?.businessName ?? 'Your restaurant',
                deliveryAddress: order?.deliveryAddress ?? 'Your saved address',
            });
            if (customer.phoneNumber) {
                await this.smsService.queueOrderConfirmationSms({
                    to: customer.phoneNumber,
                    orderNumber: event.orderNumber,
                    vendorName: vendor?.businessName,
                });
            }
        }
        catch (error) {
            this.logger.error(`handleOrderCreated error for order ${event.orderNumber}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async handleOrderStatusUpdated(event) {
        const notifiableStatuses = [
            order_status_enum_1.OrderStatus.CONFIRMED,
            order_status_enum_1.OrderStatus.CANCELLED,
        ];
        if (!notifiableStatuses.includes(event.newStatus)) {
            return;
        }
        try {
            const customer = await this.customerRepo.findOne({
                where: { id: event.customerId },
                relations: ['user'],
            });
            if (!customer?.user)
                return;
            await this.mailService.queueOrderStatusUpdateEmail({
                to: customer.user.email,
                orderNumber: event.orderNumber,
                newStatus: event.newStatus,
                reason: event.cancellationReason,
                estimatedPrepTimeMinutes: event.estimatedPrepTimeMinutes,
            });
            if (customer.phoneNumber &&
                event.newStatus === order_status_enum_1.OrderStatus.CANCELLED) {
                await this.smsService.queueOrderCancelledSms({
                    to: customer.phoneNumber,
                    orderNumber: event.orderNumber,
                });
            }
        }
        catch (error) {
            this.logger.error(`handleOrderStatusUpdated error for order ${event.orderNumber}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async handleDeliveryAssigned(event) {
        try {
            const customer = await this.customerRepo.findOne({
                where: { id: event.customerId },
                relations: ['user'],
            });
            if (!customer?.phoneNumber)
                return;
            await this.smsService.queueDeliveryAssignedSms({
                to: customer.phoneNumber,
                orderNumber: event.orderNumber,
            });
        }
        catch (error) {
            this.logger.error(`handleDeliveryAssigned error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async handleDeliveryCompleted(event) {
        if (event.newStatus !== delivery_status_enum_1.DeliveryStatus.DELIVERED)
            return;
        try {
            const customer = await this.customerRepo.findOne({
                where: { id: event.customerId },
                relations: ['user'],
            });
            if (!customer?.user)
                return;
            const order = await this.orderRepo.findOne({
                where: { id: event.orderId },
            });
            if (!order)
                return;
            await this.mailService.queueDeliveryCompletionEmail({
                to: customer.user.email,
                orderNumber: order.orderNumber,
                deliveredAt: event.timestamp,
            });
            if (customer.phoneNumber) {
                await this.smsService.queueDeliveryCompletionSms({
                    to: customer.phoneNumber,
                    orderNumber: order.orderNumber,
                });
            }
        }
        catch (error) {
            this.logger.error(`handleDeliveryCompleted error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};
exports.CommunicationEventsListener = CommunicationEventsListener;
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.USER_REGISTERED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommunicationEventsListener.prototype, "handleUserRegistered", null);
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.ORDER_CREATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommunicationEventsListener.prototype, "handleOrderCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.ORDER_STATUS_UPDATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommunicationEventsListener.prototype, "handleOrderStatusUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_ASSIGNED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommunicationEventsListener.prototype, "handleDeliveryAssigned", null);
__decorate([
    (0, event_emitter_1.OnEvent)(notification_events_1.NOTIFICATION_EVENTS.DELIVERY_COMPLETED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommunicationEventsListener.prototype, "handleDeliveryCompleted", null);
exports.CommunicationEventsListener = CommunicationEventsListener = CommunicationEventsListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(customer_profile_entity_1.CustomerProfile)),
    __param(3, (0, typeorm_1.InjectRepository)(vendor_profile_entity_1.VendorProfile)),
    __param(4, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __metadata("design:paramtypes", [mail_service_1.MailService,
        sms_service_1.SmsService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CommunicationEventsListener);
//# sourceMappingURL=communication-events.listener.js.map