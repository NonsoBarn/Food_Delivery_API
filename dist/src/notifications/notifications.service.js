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
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
const notifications_gateway_1 = require("./gateways/notifications.gateway");
let NotificationService = NotificationService_1 = class NotificationService {
    notificationRepo;
    gateway;
    logger = new common_1.Logger(NotificationService_1.name);
    constructor(notificationRepo, gateway) {
        this.notificationRepo = notificationRepo;
        this.gateway = gateway;
    }
    async create(input) {
        const notification = this.notificationRepo.create({
            userId: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            data: input.data ?? null,
            isRead: false,
        });
        const saved = await this.notificationRepo.save(notification);
        this.logger.debug(`Notification created for user ${input.userId}: [${input.type}] ${input.title}`);
        this.gateway.server.to(`user:${input.userId}`).emit('notification:new', {
            id: saved.id,
            type: saved.type,
            title: saved.title,
            message: saved.message,
            data: saved.data,
            isRead: false,
            createdAt: saved.createdAt,
        });
        return saved;
    }
    async findUserNotifications(userId, query) {
        const limit = query.limit ?? 20;
        const offset = query.offset ?? 0;
        const unreadOnly = query.unreadOnly ?? false;
        const where = { userId };
        if (unreadOnly) {
            where.isRead = false;
        }
        const [items, total] = await this.notificationRepo.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
        const unreadCount = await this.notificationRepo.count({
            where: { userId, isRead: false },
        });
        return { items, total, unreadCount };
    }
    async markAsRead(id, userId) {
        const notification = await this.notificationRepo.findOne({
            where: { id, userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException(`Notification not found or does not belong to this user`);
        }
        if (notification.isRead) {
            return notification;
        }
        notification.isRead = true;
        notification.readAt = new Date();
        return this.notificationRepo.save(notification);
    }
    async markAllAsRead(userId) {
        const result = await this.notificationRepo.update({ userId, isRead: false }, { isRead: true, readAt: new Date() });
        const updated = result.affected ?? 0;
        this.logger.debug(`Marked ${updated} notifications as read for user ${userId}`);
        return { updated };
    }
    async delete(id, userId) {
        const notification = await this.notificationRepo.findOne({
            where: { id, userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException(`Notification not found or does not belong to this user`);
        }
        await this.notificationRepo.remove(notification);
    }
    async getUnreadCount(userId) {
        const unreadCount = await this.notificationRepo.count({
            where: { userId, isRead: false },
        });
        return { unreadCount };
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        notifications_gateway_1.NotificationsGateway])
], NotificationService);
//# sourceMappingURL=notifications.service.js.map