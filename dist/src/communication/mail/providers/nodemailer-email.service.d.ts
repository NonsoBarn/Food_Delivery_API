import type { IEmailService, OrderEmailData, StatusEmailData, DeliveryEmailData } from '../interfaces/email-service.interface';
export declare class NodemailerEmailService implements IEmailService {
    sendWelcome(_to: string, _role: string): Promise<void>;
    sendOrderConfirmation(_data: OrderEmailData): Promise<void>;
    sendOrderStatusUpdate(_data: StatusEmailData): Promise<void>;
    sendDeliveryCompletion(_data: DeliveryEmailData): Promise<void>;
    getProviderName(): string;
}
