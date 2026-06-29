import { Repository } from 'typeorm';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { NotificationService } from '../notifications.service';
import type { DeliveryAssignedEvent, DeliveryStatusUpdatedEvent } from '../events/notification-events';
import { RiderProfile } from '../../users/entities/rider-profile.entity';
import { CustomerProfile } from '../../users/entities/customer-profile.entity';
export declare class DeliveryEventsListener {
    private readonly gateway;
    private readonly notificationService;
    private readonly riderRepo;
    private readonly customerRepo;
    private readonly logger;
    constructor(gateway: NotificationsGateway, notificationService: NotificationService, riderRepo: Repository<RiderProfile>, customerRepo: Repository<CustomerProfile>);
    handleDeliveryAssigned(event: DeliveryAssignedEvent): Promise<void>;
    handleDeliveryAccepted(event: DeliveryStatusUpdatedEvent): Promise<void>;
    handleDeliveryRejected(event: DeliveryStatusUpdatedEvent): void;
    handleDeliveryPickedUp(event: DeliveryStatusUpdatedEvent): Promise<void>;
    handleDeliveryCompleted(event: DeliveryStatusUpdatedEvent): Promise<void>;
    handleDeliveryCancelled(event: DeliveryStatusUpdatedEvent): Promise<void>;
}
