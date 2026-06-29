import { Repository } from 'typeorm';
import type Redis from 'ioredis';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';
import { CustomerProfile } from '../../users/entities/customer-profile.entity';
import { MailService } from '../../communication/mail/mail.service';
export declare class ReminderEmailsJob {
    private readonly redis;
    private readonly userRepo;
    private readonly orderRepo;
    private readonly customerRepo;
    private readonly mailService;
    private readonly logger;
    private readonly RECENT_ORDER_WINDOW_MS;
    private readonly REMINDER_COOLDOWN_SECONDS;
    constructor(redis: Redis, userRepo: Repository<User>, orderRepo: Repository<Order>, customerRepo: Repository<CustomerProfile>, mailService: MailService);
    sendAbandonedCartReminders(): Promise<void>;
    private processCartKey;
}
