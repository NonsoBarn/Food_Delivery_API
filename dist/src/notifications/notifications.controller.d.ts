import { NotificationService } from './notifications.service';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { User } from '../users/entities/user.entity';
export declare class NotificationsController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    getUserNotifications(user: User, query: GetNotificationsDto): Promise<{
        items: import("./entities/notification.entity").Notification[];
        total: number;
        unreadCount: number;
    }>;
    getUnreadCount(user: User): Promise<{
        unreadCount: number;
    }>;
    markAllAsRead(user: User): Promise<{
        updated: number;
    }>;
    markAsRead(id: string, user: User): Promise<import("./entities/notification.entity").Notification>;
    deleteNotification(id: string, user: User): Promise<void>;
}
