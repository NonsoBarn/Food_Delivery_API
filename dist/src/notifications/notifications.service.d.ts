import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import type { GetNotificationsDto } from './dto/get-notifications.dto';
import { NotificationsGateway } from './gateways/notifications.gateway';
interface CreateNotificationInput {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
}
export declare class NotificationService {
    private readonly notificationRepo;
    private readonly gateway;
    private readonly logger;
    constructor(notificationRepo: Repository<Notification>, gateway: NotificationsGateway);
    create(input: CreateNotificationInput): Promise<Notification>;
    findUserNotifications(userId: string, query: GetNotificationsDto): Promise<{
        items: Notification[];
        total: number;
        unreadCount: number;
    }>;
    markAsRead(id: string, userId: string): Promise<Notification>;
    markAllAsRead(userId: string): Promise<{
        updated: number;
    }>;
    delete(id: string, userId: string): Promise<void>;
    getUnreadCount(userId: string): Promise<{
        unreadCount: number;
    }>;
}
export {};
