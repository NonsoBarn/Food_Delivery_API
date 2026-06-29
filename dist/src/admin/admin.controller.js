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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const vendor_action_dto_1 = require("./dto/vendor-action.dto");
const report_query_dto_1 = require("./dto/report-query.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const vendor_profile_entity_1 = require("../users/entities/vendor-profile.entity");
const user_entity_1 = require("../users/entities/user.entity");
const create_category_dto_1 = require("../products/dto/create-category.dto");
const update_category_dto_1 = require("../products/dto/update-category.dto");
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getPlatformStats() {
        const stats = await this.adminService.getPlatformStats();
        return {
            message: 'Platform statistics retrieved successfully',
            data: stats,
        };
    }
    async getVendors(status, page, limit) {
        const result = await this.adminService.getVendors(status, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20);
        return {
            message: 'Vendors retrieved successfully',
            ...result,
        };
    }
    async getVendorById(id) {
        const vendor = await this.adminService.getVendorById(id);
        return {
            message: 'Vendor retrieved successfully',
            data: vendor,
        };
    }
    async updateVendorStatus(id, dto, admin) {
        const vendor = await this.adminService.updateVendorStatus(id, dto, admin.id);
        return {
            message: `Vendor status updated to '${dto.status}' successfully`,
            data: vendor,
        };
    }
    async getAllUsers(role, page, limit) {
        const result = await this.adminService.getAllUsers(role, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20);
        return {
            message: 'Users retrieved successfully',
            ...result,
        };
    }
    async generateReport(query) {
        const report = await this.adminService.generateReport(query);
        return {
            message: 'Report generated successfully',
            data: report,
        };
    }
    async getAllCategories() {
        const categories = await this.adminService.getAllCategories();
        return {
            message: 'Categories retrieved successfully',
            data: categories,
        };
    }
    async createCategory(dto) {
        const category = await this.adminService.createCategory(dto);
        return {
            message: 'Category created successfully',
            data: category,
        };
    }
    async updateCategory(id, dto) {
        const category = await this.adminService.updateCategory(id, dto);
        return {
            message: 'Category updated successfully',
            data: category,
        };
    }
    async deleteCategory(id) {
        await this.adminService.deleteCategory(id);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get platform-wide statistics snapshot', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Users, orders, and revenue counts' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPlatformStats", null);
__decorate([
    (0, common_1.Get)('vendors'),
    (0, swagger_1.ApiOperation)({ summary: 'List vendors (paginated, filterable)', description: 'Roles: admin' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'Filter by vendor status' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated vendor list' }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getVendors", null);
__decorate([
    (0, common_1.Get)('vendors/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get vendor by ID with stats', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Vendor detail with productCount, totalOrders, totalRevenue' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getVendorById", null);
__decorate([
    (0, common_1.Patch)('vendors/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve, reject, or suspend a vendor', description: 'Roles: admin. Rejection requires rejectionReason.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated vendor' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, vendor_action_dto_1.VendorActionDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateVendorStatus", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, swagger_1.ApiOperation)({ summary: 'List all users (paginated, filterable by role)', description: 'Roles: admin' }),
    (0, swagger_1.ApiQuery)({ name: 'role', required: false, description: 'Filter by role' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated user list' }),
    __param(0, (0, common_1.Query)('role')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Get)('reports'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate revenue and order report', description: 'Roles: admin. Supports daily/weekly/monthly grouping.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Report with revenueTimeline, ordersByStatus, topVendors' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "generateReport", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'List all categories including inactive', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'All categories' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllCategories", null);
__decorate([
    (0, common_1.Post)('categories'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a food category', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Category created' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_category_dto_1.CreateCategoryDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Patch)('categories/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a category', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated category' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_category_dto_1.UpdateCategoryDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Soft-delete a category', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Category deleted' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteCategory", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({ path: 'admin', version: '1' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map