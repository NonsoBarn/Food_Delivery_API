"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodemailerEmailService = void 0;
const common_1 = require("@nestjs/common");
let NodemailerEmailService = class NodemailerEmailService {
    async sendWelcome(_to, _role) {
        throw new Error('NodemailerEmailService is not yet configured. Set DEFAULT_EMAIL_PROVIDER=sendgrid or implement SMTP config.');
    }
    async sendOrderConfirmation(_data) {
        throw new Error('NodemailerEmailService is not yet configured.');
    }
    async sendOrderStatusUpdate(_data) {
        throw new Error('NodemailerEmailService is not yet configured.');
    }
    async sendDeliveryCompletion(_data) {
        throw new Error('NodemailerEmailService is not yet configured.');
    }
    getProviderName() {
        return 'nodemailer';
    }
};
exports.NodemailerEmailService = NodemailerEmailService;
exports.NodemailerEmailService = NodemailerEmailService = __decorate([
    (0, common_1.Injectable)()
], NodemailerEmailService);
//# sourceMappingURL=nodemailer-email.service.js.map