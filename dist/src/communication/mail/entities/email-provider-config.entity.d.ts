import { EmailProvider } from '../enums/email-provider.enum';
export declare class EmailProviderConfig {
    id: string;
    provider: EmailProvider;
    isEnabled: boolean;
    displayName: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
