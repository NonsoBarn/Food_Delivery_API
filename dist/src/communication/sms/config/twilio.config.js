"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.twilioConfig = void 0;
const config_1 = require("@nestjs/config");
exports.twilioConfig = (0, config_1.registerAs)('twilio', () => ({
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
}));
//# sourceMappingURL=twilio.config.js.map