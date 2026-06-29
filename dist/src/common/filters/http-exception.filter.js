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
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const nest_winston_1 = require("nest-winston");
const winston_1 = require("winston");
let AllExceptionsFilter = class AllExceptionsFilter {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = request.id || 'unknown';
        const status = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const message = exception instanceof common_1.HttpException
            ? exception.message
            : 'Internal server error';
        const errorResponse = exception instanceof common_1.HttpException
            ? exception.getResponse()
            : null;
        const errorObject = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message,
            requestId,
        };
        if (errorResponse &&
            typeof errorResponse === 'object' &&
            errorResponse !== null) {
            if (errorResponse.error) {
                errorObject.error = errorResponse.error;
            }
            if (Array.isArray(errorResponse.message)) {
                errorObject.message = errorResponse.message;
            }
            else if (errorResponse.message && errorResponse.message !== message) {
                errorObject.message = errorResponse.message;
            }
        }
        if (status >= common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
            if (exception instanceof Error) {
                this.logger.error({
                    level: 'error',
                    message: `[${requestId}] ${request.method} ${request.url}`,
                    stack: exception.stack,
                    statusCode: status,
                    requestId,
                    method: request.method,
                    path: request.url,
                    error: exception.message,
                });
            }
            else {
                this.logger.error({
                    level: 'error',
                    message: `[${requestId}] ${request.method} ${request.url}`,
                    statusCode: status,
                    requestId,
                    method: request.method,
                    path: request.url,
                    error: String(exception),
                });
            }
        }
        else {
            this.logger.warn({
                level: 'warn',
                message: `[${requestId}] ${request.method} ${request.url} - ${message}`,
                statusCode: status,
                requestId,
                method: request.method,
                path: request.url,
                error: message,
            });
        }
        response.status(status).json(errorObject);
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [winston_1.Logger])
], AllExceptionsFilter);
//# sourceMappingURL=http-exception.filter.js.map