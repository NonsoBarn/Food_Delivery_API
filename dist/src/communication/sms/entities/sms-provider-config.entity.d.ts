import { SmsProvider } from '../enums/sms-provider.enum';
export declare class SmsProviderConfig {
    id: string;
    provider: SmsProvider;
    isEnabled: boolean;
    displayName: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
