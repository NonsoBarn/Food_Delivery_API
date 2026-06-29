import { ConfigService } from '@nestjs/config';
import type { IEmailService, OrderEmailData, StatusEmailData, DeliveryEmailData } from '../interfaces/email-service.interface';
export declare class SendGridEmailService implements IEmailService {
    private readonly configService;
    private readonly logger;
    private readonly fromEmail;
    private readonly fromName;
    constructor(configService: ConfigService);
    sendWelcome(to: string, role: string): Promise<void>;
    sendOrderConfirmation(data: OrderEmailData): Promise<void>;
    sendOrderStatusUpdate(data: StatusEmailData): Promise<void>;
    sendDeliveryCompletion(data: DeliveryEmailData): Promise<void>;
    getProviderName(): string;
    private sendEmail;
}
