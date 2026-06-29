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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const vendor_profile_entity_1 = require("../users/entities/vendor-profile.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const product_entity_1 = require("../products/entities/product.entity");
const categories_service_1 = require("../products/categories.service");
const order_status_enum_1 = require("../orders/enums/order-status.enum");
const report_query_dto_1 = require("./dto/report-query.dto");
const PERIOD_TO_TRUNC = {
    [report_query_dto_1.ReportPeriod.DAILY]: 'day',
    [report_query_dto_1.ReportPeriod.WEEKLY]: 'week',
    [report_query_dto_1.ReportPeriod.MONTHLY]: 'month',
};
let AdminService = AdminService_1 = class AdminService {
    userRepo;
    vendorProfileRepo;
    orderRepo;
    productRepo;
    categoriesService;
    logger = new common_1.Logger(AdminService_1.name);
    constructor(userRepo, vendorProfileRepo, orderRepo, productRepo, categoriesService) {
        this.userRepo = userRepo;
        this.vendorProfileRepo = vendorProfileRepo;
        this.orderRepo = orderRepo;
        this.productRepo = productRepo;
        this.categoriesService = categoriesService;
    }
    async getPlatformStats() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [usersByRole, ordersByStatus, todayRevenueResult, pendingVendorCount,] = await Promise.all([
            this.userRepo
                .createQueryBuilder('u')
                .select('u.role', 'role')
                .addSelect('COUNT(*)', 'count')
                .groupBy('u.role')
                .getRawMany(),
            this.orderRepo
                .createQueryBuilder('o')
                .select('o.status', 'status')
                .addSelect('COUNT(*)', 'count')
                .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
                .groupBy('o.status')
                .orderBy('count', 'DESC')
                .getRawMany(),
            this.orderRepo
                .createQueryBuilder('o')
                .select('COALESCE(SUM(o.total), 0)', 'revenue')
                .where('o.status = :status', { status: order_status_enum_1.OrderStatus.DELIVERED })
                .andWhere('o.createdAt >= :todayStart', { todayStart })
                .getRawOne(),
            this.vendorProfileRepo.count({
                where: { status: vendor_profile_entity_1.VendorStatus.PENDING },
            }),
        ]);
        const deliveredRow = ordersByStatus.find((r) => r.status === order_status_enum_1.OrderStatus.DELIVERED);
        const totalRevenue = parseFloat(String(deliveredRow?.revenue ?? '0'));
        return {
            usersByRole: usersByRole.map((r) => ({
                role: r.role,
                count: parseInt(String(r.count), 10),
            })),
            ordersByStatus: ordersByStatus.map((r) => ({
                status: r.status,
                count: parseInt(String(r.count), 10),
                revenue: parseFloat(String(r.revenue ?? '0')),
            })),
            todayRevenue: parseFloat(String(todayRevenueResult?.revenue ?? '0')),
            totalRevenue,
            pendingVendorApplications: pendingVendorCount,
        };
    }
    async getVendors(status, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const qb = this.vendorProfileRepo
            .createQueryBuilder('vendor')
            .leftJoinAndSelect('vendor.user', 'user')
            .select([
            'vendor',
            'user.id',
            'user.email',
            'user.role',
            'user.createdAt',
        ])
            .orderBy('vendor.createdAt', 'DESC')
            .skip(skip)
            .take(limit);
        if (status) {
            qb.where('vendor.status = :status', { status });
        }
        const [vendors, total] = await qb.getManyAndCount();
        return {
            vendors,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getVendorById(id) {
        const [vendor, productCount, orderStats] = await Promise.all([
            this.vendorProfileRepo
                .createQueryBuilder('vendor')
                .leftJoinAndSelect('vendor.user', 'user')
                .select([
                'vendor',
                'user.id',
                'user.email',
                'user.role',
                'user.createdAt',
            ])
                .where('vendor.id = :id', { id })
                .getOne(),
            this.productRepo.count({ where: { vendorId: id } }),
            this.orderRepo
                .createQueryBuilder('o')
                .select('COUNT(o.id)', 'totalOrders')
                .addSelect('COALESCE(SUM(o.total), 0)', 'totalRevenue')
                .where('o.vendorId = :id', { id })
                .andWhere('o.status = :status', { status: order_status_enum_1.OrderStatus.DELIVERED })
                .getRawOne(),
        ]);
        if (!vendor) {
            throw new common_1.NotFoundException(`Vendor with ID ${id} not found`);
        }
        return {
            ...vendor,
            productCount,
            totalOrders: parseInt(String(orderStats?.totalOrders ?? '0'), 10),
            totalRevenue: parseFloat(String(orderStats?.totalRevenue ?? '0')),
        };
    }
    async updateVendorStatus(id, dto, adminUserId) {
        const vendor = await this.vendorProfileRepo.findOne({ where: { id } });
        if (!vendor) {
            throw new common_1.NotFoundException(`Vendor with ID ${id} not found`);
        }
        if (vendor.status === dto.status) {
            throw new common_1.BadRequestException(`Vendor is already in '${dto.status}' status`);
        }
        vendor.status = dto.status;
        if (dto.status === vendor_profile_entity_1.VendorStatus.APPROVED) {
            vendor.approvedAt = new Date();
            vendor.approvedBy = adminUserId;
            Object.assign(vendor, { rejectionReason: null });
        }
        else if (dto.status === vendor_profile_entity_1.VendorStatus.REJECTED) {
            vendor.rejectionReason = dto.rejectionReason;
            Object.assign(vendor, { approvedAt: null, approvedBy: null });
        }
        else if (dto.status === vendor_profile_entity_1.VendorStatus.SUSPENDED) {
            Object.assign(vendor, { approvedAt: null, approvedBy: null });
        }
        this.logger.log(`Admin ${adminUserId} changed vendor ${id} status: ${vendor.status} → ${dto.status}`);
        return this.vendorProfileRepo.save(vendor);
    }
    async getAllUsers(role, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const qb = this.userRepo
            .createQueryBuilder('user')
            .select([
            'user.id',
            'user.email',
            'user.role',
            'user.createdAt',
            'user.updatedAt',
        ])
            .orderBy('user.createdAt', 'DESC')
            .skip(skip)
            .take(limit);
        if (role) {
            qb.where('user.role = :role', { role });
        }
        const [users, total] = await qb.getManyAndCount();
        return {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async generateReport(query) {
        const period = query.period ?? report_query_dto_1.ReportPeriod.DAILY;
        const truncUnit = PERIOD_TO_TRUNC[period];
        const { start, end } = this.buildDateRange(query);
        const truncExpr = `DATE_TRUNC('${truncUnit}', o.createdAt)`;
        const [revenueTimeline, ordersByStatus, topVendors] = await Promise.all([
            this.orderRepo
                .createQueryBuilder('o')
                .select(truncExpr, 'period_start')
                .addSelect('COUNT(o.id)', 'orderCount')
                .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
                .where('o.status = :status', { status: order_status_enum_1.OrderStatus.DELIVERED })
                .andWhere('o.createdAt BETWEEN :start AND :end', { start, end })
                .groupBy(truncExpr)
                .orderBy(truncExpr, 'ASC')
                .getRawMany(),
            this.orderRepo
                .createQueryBuilder('o')
                .select('o.status', 'status')
                .addSelect('COUNT(o.id)', 'count')
                .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
                .where('o.createdAt BETWEEN :start AND :end', { start, end })
                .groupBy('o.status')
                .orderBy('count', 'DESC')
                .getRawMany(),
            this.orderRepo
                .createQueryBuilder('o')
                .select('o.vendorId', 'vendorId')
                .addSelect('vendor.businessName', 'businessName')
                .addSelect('COUNT(o.id)', 'orderCount')
                .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
                .innerJoin('o.vendor', 'vendor')
                .where('o.status = :status', { status: order_status_enum_1.OrderStatus.DELIVERED })
                .andWhere('o.createdAt BETWEEN :start AND :end', { start, end })
                .groupBy('o.vendorId')
                .addGroupBy('vendor.businessName')
                .orderBy('revenue', 'DESC')
                .limit(10)
                .getRawMany(),
        ]);
        return {
            period,
            dateRange: {
                from: start.toISOString(),
                to: end.toISOString(),
            },
            revenueTimeline: revenueTimeline.map((r) => ({
                periodStart: r.period_start,
                orderCount: parseInt(String(r.orderCount), 10),
                revenue: parseFloat(String(r.revenue ?? '0')),
            })),
            ordersByStatus: ordersByStatus.map((r) => ({
                status: r.status,
                count: parseInt(String(r.count), 10),
                revenue: parseFloat(String(r.revenue ?? '0')),
            })),
            topVendors: topVendors.map((r) => ({
                vendorId: r.vendorId,
                businessName: r.businessName,
                orderCount: parseInt(String(r.orderCount), 10),
                revenue: parseFloat(String(r.revenue ?? '0')),
            })),
            generatedAt: new Date().toISOString(),
        };
    }
    async getAllCategories() {
        return this.categoriesService.findAll(true);
    }
    async createCategory(dto) {
        return this.categoriesService.create(dto);
    }
    async updateCategory(id, dto) {
        return this.categoriesService.update(id, dto);
    }
    async deleteCategory(id) {
        return this.categoriesService.remove(id);
    }
    buildDateRange(query) {
        const period = query.period ?? report_query_dto_1.ReportPeriod.DAILY;
        const end = query.endDate
            ? new Date(query.endDate)
            : (() => {
                const d = new Date();
                d.setHours(23, 59, 59, 999);
                return d;
            })();
        let start;
        if (query.startDate) {
            start = new Date(query.startDate);
        }
        else {
            start = new Date();
            start.setHours(0, 0, 0, 0);
            if (period === report_query_dto_1.ReportPeriod.DAILY) {
                start.setDate(start.getDate() - 30);
            }
            else if (period === report_query_dto_1.ReportPeriod.WEEKLY) {
                start.setDate(start.getDate() - 84);
            }
            else {
                start.setMonth(start.getMonth() - 12);
            }
        }
        return { start, end };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(vendor_profile_entity_1.VendorProfile)),
    __param(2, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(3, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        categories_service_1.CategoriesService])
], AdminService);
//# sourceMappingURL=admin.service.js.map