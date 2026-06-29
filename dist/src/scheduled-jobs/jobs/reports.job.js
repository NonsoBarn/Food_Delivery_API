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
var ReportsJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsJob = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const order_entity_1 = require("../../orders/entities/order.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let ReportsJob = ReportsJob_1 = class ReportsJob {
    orderRepo;
    userRepo;
    logger = new common_1.Logger(ReportsJob_1.name);
    constructor(orderRepo, userRepo) {
        this.orderRepo = orderRepo;
        this.userRepo = userRepo;
    }
    async generateDailyReport() {
        this.logger.log('Generating daily business report...');
        const { start, end } = this.getYesterdayRange();
        const [ordersByStatus, totalUsers, newUsers] = await Promise.all([
            this.getOrderStatsByDateRange(start, end),
            this.userRepo.count(),
            this.userRepo.count({
                where: { createdAt: (0, typeorm_2.Between)(start, end) },
            }),
        ]);
        const totalOrders = ordersByStatus.reduce((sum, row) => sum + parseInt(String(row.count), 10), 0);
        const totalRevenue = ordersByStatus.reduce((sum, row) => sum + parseFloat(String(row.revenue ?? '0')), 0);
        this.logger.log(JSON.stringify({
            report: 'daily',
            period: {
                from: start.toISOString(),
                to: end.toISOString(),
                label: 'Yesterday',
            },
            orders: {
                total: totalOrders,
                revenue: `₦${totalRevenue.toFixed(2)}`,
                byStatus: ordersByStatus.map((row) => ({
                    status: row.status,
                    count: parseInt(String(row.count), 10),
                    revenue: `₦${parseFloat(String(row.revenue ?? '0')).toFixed(2)}`,
                })),
            },
            users: {
                total: totalUsers,
                newYesterday: newUsers,
            },
            generatedAt: new Date().toISOString(),
        }));
    }
    async generateWeeklyReport() {
        this.logger.log('Generating weekly business report...');
        const { start, end } = this.getLastWeekRange();
        const [ordersByStatus, newUsers] = await Promise.all([
            this.getOrderStatsByDateRange(start, end),
            this.userRepo.count({
                where: { createdAt: (0, typeorm_2.Between)(start, end) },
            }),
        ]);
        const totalOrders = ordersByStatus.reduce((sum, row) => sum + parseInt(String(row.count), 10), 0);
        const totalRevenue = ordersByStatus.reduce((sum, row) => sum + parseFloat(String(row.revenue ?? '0')), 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        this.logger.log(JSON.stringify({
            report: 'weekly',
            period: {
                from: start.toISOString(),
                to: end.toISOString(),
                label: 'Last 7 days',
            },
            orders: {
                total: totalOrders,
                revenue: `₦${totalRevenue.toFixed(2)}`,
                averageOrderValue: `₦${avgOrderValue.toFixed(2)}`,
                byStatus: ordersByStatus.map((row) => ({
                    status: row.status,
                    count: parseInt(String(row.count), 10),
                    revenue: `₦${parseFloat(String(row.revenue ?? '0')).toFixed(2)}`,
                })),
            },
            users: {
                newThisWeek: newUsers,
            },
            generatedAt: new Date().toISOString(),
        }));
    }
    async getOrderStatsByDateRange(start, end) {
        return this.orderRepo
            .createQueryBuilder('o')
            .select('o.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
            .where('o.createdAt BETWEEN :start AND :end', { start, end })
            .groupBy('o.status')
            .orderBy('count', 'DESC')
            .getRawMany();
    }
    getYesterdayRange() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfYesterday = new Date(today);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const endOfYesterday = new Date(today);
        endOfYesterday.setMilliseconds(-1);
        return { start: startOfYesterday, end: endOfYesterday };
    }
    getLastWeekRange() {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return { start: sevenDaysAgo, end: now };
    }
};
exports.ReportsJob = ReportsJob;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_8AM, { name: 'daily-report' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReportsJob.prototype, "generateDailyReport", null);
__decorate([
    (0, schedule_1.Cron)('0 8 * * 1', { name: 'weekly-report' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReportsJob.prototype, "generateWeeklyReport", null);
exports.ReportsJob = ReportsJob = ReportsJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ReportsJob);
//# sourceMappingURL=reports.job.js.map