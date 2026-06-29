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
var ReminderEmailsJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderEmailsJob = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const user_entity_1 = require("../../users/entities/user.entity");
const order_entity_1 = require("../../orders/entities/order.entity");
const customer_profile_entity_1 = require("../../users/entities/customer-profile.entity");
const mail_service_1 = require("../../communication/mail/mail.service");
let ReminderEmailsJob = ReminderEmailsJob_1 = class ReminderEmailsJob {
    redis;
    userRepo;
    orderRepo;
    customerRepo;
    mailService;
    logger = new common_1.Logger(ReminderEmailsJob_1.name);
    RECENT_ORDER_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
    REMINDER_COOLDOWN_SECONDS = 24 * 60 * 60;
    constructor(redis, userRepo, orderRepo, customerRepo, mailService) {
        this.redis = redis;
        this.userRepo = userRepo;
        this.orderRepo = orderRepo;
        this.customerRepo = customerRepo;
        this.mailService = mailService;
    }
    async sendAbandonedCartReminders() {
        this.logger.log('Abandoned cart reminder job started...');
        const threeDaysAgo = new Date(Date.now() - this.RECENT_ORDER_WINDOW_MS);
        let scannedCarts = 0;
        let remindersQueued = 0;
        let skippedRecentOrder = 0;
        let skippedAlreadySent = 0;
        let cursor = '0';
        do {
            const [nextCursor, cartKeys] = await this.redis.scan(cursor, 'MATCH', 'cart:user:*', 'COUNT', 50);
            cursor = nextCursor;
            for (const cartKey of cartKeys) {
                scannedCarts++;
                await this.processCartKey(cartKey, threeDaysAgo, () => skippedRecentOrder++, () => skippedAlreadySent++, () => remindersQueued++);
            }
        } while (cursor !== '0');
        this.logger.log(JSON.stringify({
            event: 'cart_reminders_complete',
            scannedCarts,
            remindersQueued,
            skippedRecentOrder,
            skippedAlreadySent,
            timestamp: new Date().toISOString(),
        }));
    }
    async processCartKey(cartKey, threeDaysAgo, onRecentOrder, onAlreadySent, onQueued) {
        const parts = cartKey.split(':');
        if (parts.length < 3)
            return;
        const userId = parts.slice(2).join(':');
        const cartSize = await this.redis.hlen(cartKey);
        if (cartSize === 0)
            return;
        const reminderKey = `reminder:sent:${userId}`;
        const alreadySent = await this.redis.get(reminderKey);
        if (alreadySent) {
            onAlreadySent();
            return;
        }
        const customerProfile = await this.customerRepo.findOne({
            where: { userId },
        });
        if (customerProfile) {
            const recentOrder = await this.orderRepo.findOne({
                where: {
                    customerId: customerProfile.id,
                    createdAt: (0, typeorm_2.MoreThan)(threeDaysAgo),
                },
            });
            if (recentOrder) {
                onRecentOrder();
                return;
            }
        }
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            return;
        try {
            await this.mailService.queueAbandonedCartEmail(user.email, cartSize);
            await this.redis.set(reminderKey, '1', 'EX', this.REMINDER_COOLDOWN_SECONDS);
            onQueued();
            this.logger.debug(`Queued abandoned cart reminder for user ${userId}`);
        }
        catch (error) {
            this.logger.error(`Failed to queue reminder for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};
exports.ReminderEmailsJob = ReminderEmailsJob;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_10AM, { name: 'cart-reminders' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReminderEmailsJob.prototype, "sendAbandonedCartReminders", null);
exports.ReminderEmailsJob = ReminderEmailsJob = ReminderEmailsJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(3, (0, typeorm_1.InjectRepository)(customer_profile_entity_1.CustomerProfile)),
    __metadata("design:paramtypes", [Function, typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        mail_service_1.MailService])
], ReminderEmailsJob);
//# sourceMappingURL=reminder-emails.job.js.map