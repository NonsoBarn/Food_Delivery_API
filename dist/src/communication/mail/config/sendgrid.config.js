"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendgridConfig = void 0;
const config_1 = require("@nestjs/config");
exports.sendgridConfig = (0, config_1.registerAs)('sendgrid', () => ({
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || '',
    fromName: process.env.SENDGRID_FROM_NAME || 'Food Delivery App',
}));
//# sourceMappingURL=sendgrid.config.js.map