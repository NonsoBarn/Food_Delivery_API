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
exports.VendorDashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const vendor_dashboard_service_1 = require("./vendor-dashboard.service");
const revenue_query_dto_1 = require("./dto/revenue-query.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const user_entity_1 = require("../users/entities/user.entity");
let VendorDashboardController = class VendorDashboardController {
    vendorDashboardService;
    constructor(vendorDashboardService) {
        this.vendorDashboardService = vendorDashboardService;
    }
    async getDashboard(user) {
        const stats = await this.vendorDashboardService.getVendorDashboard(user.id);
        return {
            message: 'Vendor dashboard retrieved successfully',
            data: stats,
        };
    }
    async getProductPerformance(user) {
        const products = await this.vendorDashboardService.getProductPerformance(user.id);
        return {
            message: 'Product performance metrics retrieved successfully',
            data: products,
        };
    }
    async getRevenueBreakdown(user, query) {
        const revenue = await this.vendorDashboardService.getRevenueBreakdown(user.id, query);
        return {
            message: 'Revenue breakdown retrieved successfully',
            data: revenue,
        };
    }
};
exports.VendorDashboardController = VendorDashboardController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get vendor business health snapshot', description: 'Roles: vendor. Returns sales, orders, revenue, and rating summary.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Vendor dashboard stats' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], VendorDashboardController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('products/performance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get products ranked by revenue', description: 'Roles: vendor' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Products with orderCount, viewCount, and revenue' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], VendorDashboardController.prototype, "getProductPerformance", null);
__decorate([
    (0, common_1.Get)('revenue'),
    (0, swagger_1.ApiOperation)({ summary: 'Get revenue trend by time period', description: 'Roles: vendor. Returns timeline data for a chart.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Revenue breakdown with timeline and summary' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        revenue_query_dto_1.RevenueQueryDto]),
    __metadata("design:returntype", Promise)
], VendorDashboardController.prototype, "getRevenueBreakdown", null);
exports.VendorDashboardController = VendorDashboardController = __decorate([
    (0, swagger_1.ApiTags)('Vendor Dashboard'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({ path: 'vendors', version: '1' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR),
    __metadata("design:paramtypes", [vendor_dashboard_service_1.VendorDashboardService])
], VendorDashboardController);
//# sourceMappingURL=vendor-dashboard.controller.js.map