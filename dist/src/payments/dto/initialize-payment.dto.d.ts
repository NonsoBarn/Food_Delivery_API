import { PaymentProvider } from '../enums/payment-provider.enum';
export declare class InitializePaymentDto {
    orderGroupId: string;
    provider: PaymentProvider;
    callbackUrl?: string;
}
