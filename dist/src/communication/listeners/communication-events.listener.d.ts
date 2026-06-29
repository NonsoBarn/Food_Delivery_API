import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { CustomerProfile } from '../../users/entities/customer-profile.entity';
import { VendorProfile } from '../../users/entities/vendor-profile.entity';
import { Order } from '../../orders/entities/order.entity';
import type { UserRegisteredEvent, OrderCreatedEvent, OrderStatusUpdatedEvent, DeliveryAssignedEvent, DeliveryStatusUpdatedEvent } from '../../notifications/events/notification-events';
export declare class CommunicationEventsListener {
    private readonly mailService;
    private readonly smsService;
    private readonly customerRepo;
    private readonly vendorRepo;
    private readonly orderRepo;
    private readonly logger;
    constructor(mailService: MailService, smsService: SmsService, customerRepo: Repository<CustomerProfile>, vendorRepo: Repository<VendorProfile>, orderRepo: Repository<Order>);
    handleUserRegistered(event: UserRegisteredEvent): Promise<void>;
    handleOrderCreated(event: OrderCreatedEvent): Promise<void>;
    handleOrderStatusUpdated(event: OrderStatusUpdatedEvent): Promise<void>;
    handleDeliveryAssigned(event: DeliveryAssignedEvent): Promise<void>;
    handleDeliveryCompleted(event: DeliveryStatusUpdatedEvent): Promise<void>;
}
