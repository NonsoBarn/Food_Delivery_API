import { registerAs } from '@nestjs/config';

/**
 * Mail Module Configuration
 *
 * Controls which email provider is active by default.
 * The admin can override this at runtime via the EmailProviderConfig DB table.
 *
 * KEY LEARNING: Two-layer config (env + DB)
 * ==========================================
 * Layer 1 — Env var (DEFAULT_EMAIL_PROVIDER): the startup default.
 *            Set in .env.development / .env.production.
 *            Requires a redeploy to change.
 *
 * Layer 2 — DB row (EmailProviderConfig.isEnabled): runtime override.
 *            Admin flips a flag via API — no redeploy needed.
 *            The factory checks DB first; falls back to this env config.
 *
 * Same pattern as payment.config.ts → DEFAULT_PAYMENT_PROVIDER.
 */
export const mailConfig = registerAs('mail', () => ({
  defaultProvider: process.env.DEFAULT_EMAIL_PROVIDER || 'sendgrid',
}));
