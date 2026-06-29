import { ConfigService } from '@nestjs/config';
import type { ISmsService, SmsOrderData, SmsDeliveryData } from '../interfaces/sms-service.interface';
export declare class TwilioSmsService implements ISmsService {
    private readonly configService;
    private readonly logger;
    private readonly client;
    private readonly fromNumber;
    private readonly isConfigured;
    constructor(configService: ConfigService);
    sendOrderConfirmation(data: SmsOrderData): Promise<void>;
    sendOrderCancelled(data: SmsOrderData): Promise<void>;
    sendDeliveryAssigned(data: SmsDeliveryData): Promise<void>;
    sendDeliveryCompletion(data: SmsDeliveryData): Promise<void>;
    getProviderName(): string;
    private sendSms;
}
