"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfricasTalkingSmsService = void 0;
const common_1 = require("@nestjs/common");
let AfricasTalkingSmsService = class AfricasTalkingSmsService {
    async sendOrderConfirmation(_data) {
        throw new Error("Africa's Talking SMS is not yet configured. Set DEFAULT_SMS_PROVIDER=twilio or implement the AT SDK.");
    }
    async sendOrderCancelled(_data) {
        throw new Error("Africa's Talking SMS is not yet configured.");
    }
    async sendDeliveryAssigned(_data) {
        throw new Error("Africa's Talking SMS is not yet configured.");
    }
    async sendDeliveryCompletion(_data) {
        throw new Error("Africa's Talking SMS is not yet configured.");
    }
    getProviderName() {
        return 'africas_talking';
    }
};
exports.AfricasTalkingSmsService = AfricasTalkingSmsService;
exports.AfricasTalkingSmsService = AfricasTalkingSmsService = __decorate([
    (0, common_1.Injectable)()
], AfricasTalkingSmsService);
//# sourceMappingURL=africas-talking-sms.service.js.map