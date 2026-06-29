import { PaymentsService } from './payments.service';
import { User } from '../users/entities/user.entity';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';
import { PaymentProvider } from './enums/payment-provider.enum';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    getEnabledProviders(): Promise<import("./entities/payment-provider-config.entity").PaymentProviderConfig[]>;
    initializePayment(dto: InitializePaymentDto, user: User): Promise<{
        paymentId: string;
        provider: PaymentProvider;
        amount: number;
        currency: string;
        transactionId: string;
        checkoutUrl: string | undefined;
        clientSecret: string | undefined;
        metadata: Record<string, any> | undefined;
    }>;
    verifyPayment(dto: VerifyPaymentDto): Promise<{
        success: boolean;
        alreadyProcessed: boolean;
        payment: import("./entities/payment.entity").Payment;
    } | {
        success: boolean;
        payment: import("./entities/payment.entity").Payment;
        alreadyProcessed?: undefined;
    }>;
    getPaymentsByOrderGroup(orderGroupId: string): Promise<import("./entities/payment.entity").Payment[]>;
    getPayment(id: string): Promise<import("./entities/payment.entity").Payment>;
    refundPayment(dto: RefundPaymentDto): Promise<{
        success: boolean;
        refund: import("./entities/payment.entity").Payment;
    }>;
    getProviderConfigs(): Promise<import("./entities/payment-provider-config.entity").PaymentProviderConfig[]>;
    updateProviderConfig(provider: PaymentProvider, dto: UpdateProviderConfigDto): Promise<import("./entities/payment-provider-config.entity").PaymentProviderConfig>;
}
