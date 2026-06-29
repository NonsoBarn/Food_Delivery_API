import type { ISmsService, SmsOrderData, SmsDeliveryData } from '../interfaces/sms-service.interface';
export declare class AfricasTalkingSmsService implements ISmsService {
    sendOrderConfirmation(_data: SmsOrderData): Promise<void>;
    sendOrderCancelled(_data: SmsOrderData): Promise<void>;
    sendDeliveryAssigned(_data: SmsDeliveryData): Promise<void>;
    sendDeliveryCompletion(_data: SmsDeliveryData): Promise<void>;
    getProviderName(): string;
}
