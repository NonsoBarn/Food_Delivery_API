"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledJobsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const cart_cleanup_job_1 = require("./jobs/cart-cleanup.job");
const reports_job_1 = require("./jobs/reports.job");
const reminder_emails_job_1 = require("./jobs/reminder-emails.job");
const order_entity_1 = require("../orders/entities/order.entity");
const user_entity_1 = require("../users/entities/user.entity");
const customer_profile_entity_1 = require("../users/entities/customer-profile.entity");
const mail_module_1 = require("../communication/mail/mail.module");
let ScheduledJobsModule = class ScheduledJobsModule {
};
exports.ScheduledJobsModule = ScheduledJobsModule;
exports.ScheduledJobsModule = ScheduledJobsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([order_entity_1.Order, user_entity_1.User, customer_profile_entity_1.CustomerProfile]),
            mail_module_1.MailModule,
        ],
        providers: [
            cart_cleanup_job_1.CartCleanupJob,
            reports_job_1.ReportsJob,
            reminder_emails_job_1.ReminderEmailsJob,
        ],
        exports: [cart_cleanup_job_1.CartCleanupJob, reports_job_1.ReportsJob, reminder_emails_job_1.ReminderEmailsJob],
    })
], ScheduledJobsModule);
//# sourceMappingURL=scheduled-jobs.module.js.map