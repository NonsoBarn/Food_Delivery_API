import { PaymentProvider } from '../enums/payment-provider.enum';
export declare class PaymentProviderConfig {
    id: string;
    provider: PaymentProvider;
    isEnabled: boolean;
    displayName: string;
    description: string;
    supportedCurrencies: string[];
    platformFeePercentage: number;
    platformFeeFixed: number;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
