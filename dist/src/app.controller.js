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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const cart_cleanup_job_1 = require("./scheduled-jobs/jobs/cart-cleanup.job");
const reports_job_1 = require("./scheduled-jobs/jobs/reports.job");
const reminder_emails_job_1 = require("./scheduled-jobs/jobs/reminder-emails.job");
let AppController = class AppController {
    appService;
    cartJob;
    reportsJob;
    reminderJob;
    constructor(appService, cartJob, reportsJob, reminderJob) {
        this.appService = appService;
        this.cartJob = cartJob;
        this.reportsJob = reportsJob;
        this.reminderJob = reminderJob;
    }
    getHello() {
        return this.appService.getHello();
    }
    health() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }
    runCartCleanup() {
        return this.cartJob.reportCartStats();
    }
    runDailyReport() {
        return this.reportsJob.generateDailyReport();
    }
    runWeeklyReport() {
        return this.reportsJob.generateWeeklyReport();
    }
    runReminders() {
        return this.reminderJob.sendAbandonedCartReminders();
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, common_1.HttpCode)(200),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], AppController.prototype, "health", null);
__decorate([
    (0, common_1.Post)('dev/jobs/cart-cleanup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "runCartCleanup", null);
__decorate([
    (0, common_1.Post)('dev/jobs/daily-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "runDailyReport", null);
__decorate([
    (0, common_1.Post)('dev/jobs/weekly-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "runWeeklyReport", null);
__decorate([
    (0, common_1.Post)('dev/jobs/cart-reminders'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "runReminders", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        cart_cleanup_job_1.CartCleanupJob,
        reports_job_1.ReportsJob,
        reminder_emails_job_1.ReminderEmailsJob])
], AppController);
//# sourceMappingURL=app.controller.js.map