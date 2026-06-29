export interface OrderEmailData {
    to: string;
    orderNumber: string;
    total: number;
    itemCount: number;
    vendorName: string;
    deliveryAddress: string;
}
export interface StatusEmailData {
    to: string;
    orderNumber: string;
    newStatus: string;
    reason?: string;
    estimatedPrepTimeMinutes?: number;
}
export interface DeliveryEmailData {
    to: string;
    orderNumber: string;
    deliveredAt: Date;
}
export interface IEmailService {
    sendWelcome(to: string, role: string): Promise<void>;
    sendOrderConfirmation(data: OrderEmailData): Promise<void>;
    sendOrderStatusUpdate(data: StatusEmailData): Promise<void>;
    sendDeliveryCompletion(data: DeliveryEmailData): Promise<void>;
    getProviderName(): string;
}
