import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  defaultProvider: process.env.DEFAULT_PAYMENT_PROVIDER || 'stripe',
  platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '15'),
  platformFeeFixed: parseFloat(process.env.PLATFORM_FEE_FIXED || '0'),
  webhookTimeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000', 10),
}));
