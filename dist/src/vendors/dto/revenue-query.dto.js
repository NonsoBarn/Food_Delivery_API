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
exports.RevenueQueryDto = exports.RevenuePeriod = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var RevenuePeriod;
(function (RevenuePeriod) {
    RevenuePeriod["DAILY"] = "daily";
    RevenuePeriod["WEEKLY"] = "weekly";
    RevenuePeriod["MONTHLY"] = "monthly";
})(RevenuePeriod || (exports.RevenuePeriod = RevenuePeriod = {}));
class RevenueQueryDto {
    period = RevenuePeriod.DAILY;
    startDate;
    endDate;
}
exports.RevenueQueryDto = RevenueQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: RevenuePeriod, default: RevenuePeriod.DAILY }),
    (0, class_validator_1.IsEnum)(RevenuePeriod, {
        message: 'period must be one of: daily, weekly, monthly',
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RevenueQueryDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-01-01', description: 'Start date (ISO 8601, inclusive)' }),
    (0, class_validator_1.IsDateString)({}, { message: 'startDate must be a valid ISO 8601 date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RevenueQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-03-31', description: 'End date (ISO 8601, inclusive)' }),
    (0, class_validator_1.IsDateString)({}, { message: 'endDate must be a valid ISO 8601 date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RevenueQueryDto.prototype, "endDate", void 0);
//# sourceMappingURL=revenue-query.dto.js.map