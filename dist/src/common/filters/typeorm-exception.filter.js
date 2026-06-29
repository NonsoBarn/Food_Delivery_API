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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeOrmExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const nest_winston_1 = require("nest-winston");
const winston_1 = require("winston");
let TypeOrmExceptionFilter = class TypeOrmExceptionFilter {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = request.id || 'unknown';
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Database error occurred';
        const pgError = exception;
        switch (pgError.code) {
            case '23505':
                status = common_1.HttpStatus.CONFLICT;
                message = this.extractUniqueViolationMessage(pgError);
                break;
            case '23503':
                status = common_1.HttpStatus.BAD_REQUEST;
                message = 'Referenced record does not exist';
                break;
            case '23502':
                status = common_1.HttpStatus.BAD_REQUEST;
                message = 'Required field is missing';
                break;
            default:
                break;
        }
        this.logger.error({
            level: 'error',
            message: `[${requestId}] DB error on ${request.method} ${request.url}`,
            stack: exception.stack,
            statusCode: status,
            requestId,
            pgCode: pgError.code,
            constraint: pgError.constraint,
            table: pgError.table,
            detail: pgError.detail,
        });
        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
            requestId,
        });
    }
    extractUniqueViolationMessage(error) {
        const detail = error.detail || '';
        const match = detail.match(/Key \((\w+)\)/);
        if (match && match[1]) {
            const column = match[1];
            return `${column} already exists`;
        }
        if (error.constraint) {
            return `Constraint violation: ${error.constraint}`;
        }
        return 'Duplicate entry found';
    }
};
exports.TypeOrmExceptionFilter = TypeOrmExceptionFilter;
exports.TypeOrmExceptionFilter = TypeOrmExceptionFilter = __decorate([
    (0, common_1.Catch)(typeorm_1.QueryFailedError),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [winston_1.Logger])
], TypeOrmExceptionFilter);
//# sourceMappingURL=typeorm-exception.filter.js.map