import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { PaymentLog } from './entities/payment-log.entity';
import { PaymentProviderConfig } from './entities/payment-provider-config.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentFactoryService } from './payment-factory.service';
import { PaymentProvider } from './enums/payment-provider.enum';
import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';
export declare class PaymentsService {
    private readonly paymentRepository;
    private readonly paymentLogRepository;
    private readonly providerConfigRepository;
    private readonly orderRepository;
    private readonly paymentFactory;
    private readonly configService;
    private readonly dataSource;
    private readonly logger;
    constructor(paymentRepository: Repository<Payment>, paymentLogRepository: Repository<PaymentLog>, providerConfigRepository: Repository<PaymentProviderConfig>, orderRepository: Repository<Order>, paymentFactory: PaymentFactoryService, configService: ConfigService, dataSource: DataSource);
    getAllProviderConfigs(): Promise<PaymentProviderConfig[]>;
    getEnabledProviders(): Promise<PaymentProviderConfig[]>;
    updateProviderConfig(provider: PaymentProvider, dto: UpdateProviderConfigDto): Promise<PaymentProviderConfig>;
    initializePayment(orderGroupId: string, customerId: string, customerEmail: string, provider: PaymentProvider, callbackUrl?: string): Promise<{
        paymentId: string;
        provider: PaymentProvider;
        amount: number;
        currency: string;
        transactionId: string;
        checkoutUrl: string | undefined;
        clientSecret: string | undefined;
        metadata: Record<string, any> | undefined;
    }>;
    verifyPayment(reference: string): Promise<{
        success: boolean;
        alreadyProcessed: boolean;
        payment: Payment;
    } | {
        success: boolean;
        payment: Payment;
        alreadyProcessed?: undefined;
    }>;
    refundPayment(paymentId: string, amount?: number, reason?: string): Promise<{
        success: boolean;
        refund: Payment;
    }>;
    processWebhookEvent(provider: PaymentProvider, event: Record<string, any>): Promise<{
        processed: boolean;
        reason: string;
        success?: undefined;
    } | {
        processed: boolean;
        success: boolean;
        reason?: undefined;
    }>;
    findOne(id: string): Promise<Payment>;
    findByOrderGroup(orderGroupId: string): Promise<Payment[]>;
    private extractEventId;
    private extractTransactionReference;
    private logEvent;
}
