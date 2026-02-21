import { registerAs } from '@nestjs/config';

/**
 * SMS Module Configuration
 *
 * Controls which SMS provider is active by default.
 * Same two-layer config pattern as mail.config.ts:
 *   Layer 1: DEFAULT_SMS_PROVIDER env var (startup default)
 *   Layer 2: SmsProviderConfig DB row (admin runtime override)
 */
export const smsConfig = registerAs('sms', () => ({
  defaultProvider: process.env.DEFAULT_SMS_PROVIDER || 'twilio',
}));
