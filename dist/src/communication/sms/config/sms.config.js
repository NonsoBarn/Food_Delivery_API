"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsConfig = void 0;
const config_1 = require("@nestjs/config");
exports.smsConfig = (0, config_1.registerAs)('sms', () => ({
    defaultProvider: process.env.DEFAULT_SMS_PROVIDER || 'twilio',
}));
//# sourceMappingURL=sms.config.js.map