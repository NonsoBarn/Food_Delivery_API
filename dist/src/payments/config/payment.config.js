"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('payment', () => ({
    defaultProvider: process.env.DEFAULT_PAYMENT_PROVIDER || 'stripe',
    platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '15'),
    platformFeeFixed: parseFloat(process.env.PLATFORM_FEE_FIXED || '0'),
    webhookTimeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000', 10),
}));
//# sourceMappingURL=payment.config.js.map