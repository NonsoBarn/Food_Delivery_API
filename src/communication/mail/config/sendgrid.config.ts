import { registerAs } from '@nestjs/config';

/**
 * SendGrid Configuration
 *
 * KEY LEARNING: registerAs() — namespaced config
 * ================================================
 * registerAs('sendgrid', ...) creates a config namespace.
 * Access it anywhere via: configService.get('sendgrid.apiKey')
 *
 * This mirrors how stripe.config.ts and paystack.config.ts work.
 * Each provider owns its own config block — no naming collisions.
 *
 * The ConfigModule.forFeature(sendgridConfig) call in MailModule
 * registers this config only for the mail module, keeping it scoped.
 */
export const sendgridConfig = registerAs('sendgrid', () => ({
  apiKey: process.env.SENDGRID_API_KEY || '',
  fromEmail: process.env.SENDGRID_FROM_EMAIL || '',
  fromName: process.env.SENDGRID_FROM_NAME || 'Food Delivery App',
}));
