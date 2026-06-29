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
exports.ReportQueryDto = exports.ReportPeriod = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var ReportPeriod;
(function (ReportPeriod) {
    ReportPeriod["DAILY"] = "daily";
    ReportPeriod["WEEKLY"] = "weekly";
    ReportPeriod["MONTHLY"] = "monthly";
})(ReportPeriod || (exports.ReportPeriod = ReportPeriod = {}));
class ReportQueryDto {
    period = ReportPeriod.DAILY;
    startDate;
    endDate;
}
exports.ReportQueryDto = ReportQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ReportPeriod, default: ReportPeriod.DAILY }),
    (0, class_validator_1.IsEnum)(ReportPeriod, {
        message: 'period must be one of: daily, weekly, monthly',
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ReportQueryDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-01-01', description: 'Start date (ISO 8601, inclusive)' }),
    (0, class_validator_1.IsDateString)({}, { message: 'startDate must be a valid ISO 8601 date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ReportQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-03-31', description: 'End date (ISO 8601, inclusive)' }),
    (0, class_validator_1.IsDateString)({}, { message: 'endDate must be a valid ISO 8601 date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ReportQueryDto.prototype, "endDate", void 0);
//# sourceMappingURL=report-query.dto.js.map