import { Repository } from 'typeorm';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { NotificationService } from '../notifications.service';
import type { OrderCreatedEvent, OrderStatusUpdatedEvent } from '../events/notification-events';
import { CustomerProfile } from '../../users/entities/customer-profile.entity';
import { VendorProfile } from '../../users/entities/vendor-profile.entity';
export declare class OrderEventsListener {
    private readonly gateway;
    private readonly notificationService;
    private readonly customerRepo;
    private readonly vendorRepo;
    private readonly logger;
    constructor(gateway: NotificationsGateway, notificationService: NotificationService, customerRepo: Repository<CustomerProfile>, vendorRepo: Repository<VendorProfile>);
    handleOrderCreated(event: OrderCreatedEvent): Promise<void>;
    handleOrderStatusUpdated(event: OrderStatusUpdatedEvent): Promise<void>;
    private buildStatusUpdatePayload;
    private buildStatusNotificationContent;
}
