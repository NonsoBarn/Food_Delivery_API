"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsProviderConfig = void 0;
const typeorm_1 = require("typeorm");
const sms_provider_enum_1 = require("../enums/sms-provider.enum");
let SmsProviderConfig = class SmsProviderConfig {
    id;
    provider;
    isEnabled;
    displayName;
    metadata;
    createdAt;
    updatedAt;
};
exports.SmsProviderConfig = SmsProviderConfig;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SmsProviderConfig.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: sms_provider_enum_1.SmsProvider,
        unique: true,
    }),
    __metadata("design:type", String)
], SmsProviderConfig.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SmsProviderConfig.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], SmsProviderConfig.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], SmsProviderConfig.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SmsProviderConfig.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SmsProviderConfig.prototype, "updatedAt", void 0);
exports.SmsProviderConfig = SmsProviderConfig = __decorate([
    (0, typeorm_1.Entity)('sms_provider_configs')
], SmsProviderConfig);
//# sourceMappingURL=sms-provider-config.entity.js.map