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
var CartCleanupJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartCleanupJob = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
let CartCleanupJob = CartCleanupJob_1 = class CartCleanupJob {
    redis;
    logger = new common_1.Logger(CartCleanupJob_1.name);
    constructor(redis) {
        this.redis = redis;
    }
    async reportCartStats() {
        this.logger.log('Cart cleanup job started — scanning Redis cart keys...');
        const startTime = Date.now();
        let totalCarts = 0;
        let totalItems = 0;
        let totalEstimatedValue = 0;
        let cursor = '0';
        do {
            const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', 'cart:user:*', 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length === 0)
                continue;
            totalCarts += keys.length;
            for (const cartKey of keys) {
                const items = await this.redis.hgetall(cartKey);
                if (!items)
                    continue;
                const itemEntries = Object.values(items);
                totalItems += itemEntries.length;
                for (const itemJson of itemEntries) {
                    try {
                        const item = JSON.parse(itemJson);
                        if (item.subtotal) {
                            totalEstimatedValue += item.subtotal;
                        }
                        else if (item.price && item.quantity) {
                            totalEstimatedValue += item.price * item.quantity;
                        }
                    }
                    catch {
                    }
                }
            }
        } while (cursor !== '0');
        const durationMs = Date.now() - startTime;
        this.logger.log(JSON.stringify({
            event: 'cart_report',
            totalActiveCarts: totalCarts,
            totalItems,
            estimatedCartValue: `₦${totalEstimatedValue.toFixed(2)}`,
            scanDurationMs: durationMs,
            timestamp: new Date().toISOString(),
        }));
    }
};
exports.CartCleanupJob = CartCleanupJob;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM, { name: 'cart-cleanup' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CartCleanupJob.prototype, "reportCartStats", null);
exports.CartCleanupJob = CartCleanupJob = CartCleanupJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __metadata("design:paramtypes", [Function])
], CartCleanupJob);
//# sourceMappingURL=cart-cleanup.job.js.map