"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailConfig = void 0;
const config_1 = require("@nestjs/config");
exports.mailConfig = (0, config_1.registerAs)('mail', () => ({
    defaultProvider: process.env.DEFAULT_EMAIL_PROVIDER || 'sendgrid',
}));
//# sourceMappingURL=mail.config.js.map