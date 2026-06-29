import { Queue } from 'bullmq';
import type { SmsOrderData, SmsDeliveryData } from './interfaces/sms-service.interface';
export declare class SmsService {
    private readonly smsQueue;
    private readonly logger;
    constructor(smsQueue: Queue);
    private readonly defaultJobOptions;
    queueOrderConfirmationSms(data: SmsOrderData): Promise<void>;
    queueOrderCancelledSms(data: SmsOrderData): Promise<void>;
    queueDeliveryAssignedSms(data: SmsDeliveryData): Promise<void>;
    queueDeliveryCompletionSms(data: SmsDeliveryData): Promise<void>;
}
