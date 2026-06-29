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
var VendorDashboardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorDashboardService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const vendor_profile_entity_1 = require("../users/entities/vendor-profile.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const order_item_entity_1 = require("../orders/entities/order-item.entity");
const product_entity_1 = require("../products/entities/product.entity");
const order_status_enum_1 = require("../orders/enums/order-status.enum");
const revenue_query_dto_1 = require("./dto/revenue-query.dto");
const PERIOD_TO_TRUNC = {
    [revenue_query_dto_1.RevenuePeriod.DAILY]: 'day',
    [revenue_query_dto_1.RevenuePeriod.WEEKLY]: 'week',
    [revenue_query_dto_1.RevenuePeriod.MONTHLY]: 'month',
};
let VendorDashboardService = VendorDashboardService_1 = class VendorDashboardService {
    vendorProfileRepo;
    orderRepo;
    orderItemRepo;
    productRepo;
    logger = new common_1.Logger(VendorDashboardService_1.name);
    constructor(vendorProfileRepo, orderRepo, orderItemRepo, productRepo) {
        this.vendorProfileRepo = vendorProfileRepo;
        this.orderRepo = orderRepo;
        this.orderItemRepo = orderItemRepo;
        this.productRepo = productRepo;
    }
    async getVendorDashboard(userId) {
        const vendor = await this.resolveVendorProfile(userId);
        const [orderStats, pendingOrders, productCount] = await Promise.all([
            this.orderRepo
                .createQueryBuilder('o')
                .select('COUNT(o.id)', 'totalOrders')
                .addSelect(`COALESCE(SUM(CASE WHEN o.status = :deliveredStatus THEN o.total ELSE 0 END), 0)`, 'totalRevenue')
                .addSelect(`COALESCE(SUM(CASE WHEN o.status = :deliveredStatus AND DATE(o.createdAt) = CURRENT_DATE THEN o.total ELSE 0 END), 0)`, 'todayRevenue')
                .where('o.vendorId = :vendorId', { vendorId: vendor.id })
                .setParameter('deliveredStatus', order_status_enum_1.OrderStatus.DELIVERED)
                .getRawOne(),
            this.orderRepo.count({
                where: {
                    vendorId: vendor.id,
                    status: (0, typeorm_2.In)([
                        order_status_enum_1.OrderStatus.PENDING,
                        order_status_enum_1.OrderStatus.CONFIRMED,
                        order_status_enum_1.OrderStatus.PREPARING,
                    ]),
                },
            }),
            this.productRepo.count({ where: { vendorId: vendor.id } }),
        ]);
        return {
            vendorId: vendor.id,
            businessName: vendor.businessName,
            vendorStatus: vendor.status,
            averageRating: parseFloat(String(vendor.rating ?? 0)),
            totalReviews: vendor.totalReviews,
            totalOrders: parseInt(String(orderStats?.totalOrders ?? '0'), 10),
            pendingOrders,
            totalRevenue: parseFloat(String(orderStats?.totalRevenue ?? '0')),
            todayRevenue: parseFloat(String(orderStats?.todayRevenue ?? '0')),
            totalProducts: productCount,
        };
    }
    async getProductPerformance(userId) {
        const vendor = await this.resolveVendorProfile(userId);
        const products = await this.productRepo.find({
            where: { vendorId: vendor.id },
            order: { createdAt: 'DESC' },
        });
        if (products.length === 0) {
            return [];
        }
        const productIds = products.map((p) => p.id);
        const revenueRows = await this.orderItemRepo
            .createQueryBuilder('oi')
            .select('oi.productId', 'productId')
            .addSelect('COALESCE(SUM(oi.subtotal), 0)', 'revenue')
            .innerJoin('oi.order', 'o')
            .where('oi.productId IN (:...productIds)', { productIds })
            .andWhere('o.status = :status', { status: order_status_enum_1.OrderStatus.DELIVERED })
            .groupBy('oi.productId')
            .getRawMany();
        const revenueMap = new Map(revenueRows.map((r) => [
            r.productId,
            parseFloat(String(r.revenue ?? '0')),
        ]));
        return products
            .map((p) => ({
            id: p.id,
            name: p.name,
            price: parseFloat(String(p.price)),
            status: p.status,
            stock: p.stock,
            rating: p.rating ? parseFloat(String(p.rating)) : null,
            reviewCount: p.reviewCount,
            orderCount: p.orderCount,
            viewCount: p.viewCount,
            revenue: revenueMap.get(p.id) ?? 0,
        }))
            .sort((a, b) => b.revenue - a.revenue);
    }
    async getRevenueBreakdown(userId, query) {
        const vendor = await this.resolveVendorProfile(userId);
        const period = query.period ?? revenue_query_dto_1.RevenuePeriod.DAILY;
        const truncUnit = PERIOD_TO_TRUNC[period];
        const { start, end } = this.buildDateRange(query);
        const truncExpr = `DATE_TRUNC('${truncUnit}', o.createdAt)`;
        const rows = await this.orderRepo
            .createQueryBuilder('o')
            .select(truncExpr, 'period_start')
            .addSelect('COUNT(o.id)', 'orderCount')
            .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
            .where('o.vendorId = :vendorId', { vendorId: vendor.id })
            .andWhere('o.status = :status', { status: order_status_enum_1.OrderStatus.DELIVERED })
            .andWhere('o.createdAt BETWEEN :start AND :end', { start, end })
            .groupBy(truncExpr)
            .orderBy(truncExpr, 'ASC')
            .getRawMany();
        const totals = rows.reduce((acc, r) => ({
            totalOrders: acc.totalOrders + parseInt(String(r.orderCount), 10),
            totalRevenue: acc.totalRevenue + parseFloat(String(r.revenue ?? '0')),
        }), { totalOrders: 0, totalRevenue: 0 });
        return {
            period,
            dateRange: {
                from: start.toISOString(),
                to: end.toISOString(),
            },
            summary: {
                totalOrders: totals.totalOrders,
                totalRevenue: totals.totalRevenue,
                averageRevenuePerPeriod: rows.length > 0 ? totals.totalRevenue / rows.length : 0,
            },
            timeline: rows.map((r) => ({
                periodStart: r.period_start,
                orderCount: parseInt(String(r.orderCount), 10),
                revenue: parseFloat(String(r.revenue ?? '0')),
            })),
        };
    }
    async resolveVendorProfile(userId) {
        const vendor = await this.vendorProfileRepo.findOne({
            where: { userId },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor profile not found. Please create your vendor profile first.');
        }
        return vendor;
    }
    buildDateRange(query) {
        const period = query.period ?? revenue_query_dto_1.RevenuePeriod.DAILY;
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
            if (period === revenue_query_dto_1.RevenuePeriod.DAILY) {
                start.setDate(start.getDate() - 30);
            }
            else if (period === revenue_query_dto_1.RevenuePeriod.WEEKLY) {
                start.setDate(start.getDate() - 84);
            }
            else {
                start.setMonth(start.getMonth() - 12);
            }
        }
        return { start, end };
    }
};
exports.VendorDashboardService = VendorDashboardService;
exports.VendorDashboardService = VendorDashboardService = VendorDashboardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(vendor_profile_entity_1.VendorProfile)),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(2, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __param(3, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], VendorDashboardService);
//# sourceMappingURL=vendor-dashboard.service.js.map