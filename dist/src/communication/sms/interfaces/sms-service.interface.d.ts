export interface SmsOrderData {
    to: string;
    orderNumber: string;
    vendorName?: string;
}
export interface SmsDeliveryData {
    to: string;
    orderNumber: string;
    riderName?: string;
}
export interface ISmsService {
    sendOrderConfirmation(data: SmsOrderData): Promise<void>;
    sendOrderCancelled(data: SmsOrderData): Promise<void>;
    sendDeliveryAssigned(data: SmsDeliveryData): Promise<void>;
    sendDeliveryCompletion(data: SmsDeliveryData): Promise<void>;
    getProviderName(): string;
}
