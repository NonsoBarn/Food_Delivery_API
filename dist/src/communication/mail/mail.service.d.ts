import { Queue } from 'bullmq';
import type { OrderEmailData, StatusEmailData, DeliveryEmailData } from './interfaces/email-service.interface';
export declare class MailService {
    private readonly emailQueue;
    private readonly logger;
    constructor(emailQueue: Queue);
    private readonly defaultJobOptions;
    queueWelcomeEmail(to: string, role: string): Promise<void>;
    queueOrderConfirmationEmail(data: OrderEmailData): Promise<void>;
    queueOrderStatusUpdateEmail(data: StatusEmailData): Promise<void>;
    queueDeliveryCompletionEmail(data: DeliveryEmailData): Promise<void>;
    queueAbandonedCartEmail(to: string, cartItemCount: number): Promise<void>;
}
