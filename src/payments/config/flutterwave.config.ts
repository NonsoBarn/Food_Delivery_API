import { registerAs } from '@nestjs/config';

export default registerAs('flutterwave', () => ({
  secretKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
  publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
  encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY || '',
  webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET || '',
  currency: process.env.FLUTTERWAVE_CURRENCY || 'NGN',
}));
