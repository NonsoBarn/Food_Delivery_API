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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const orders_service_1 = require("./orders.service");
const create_order_dto_1 = require("./dto/create-order.dto");
const update_order_status_dto_1 = require("./dto/update-order-status.dto");
const order_filter_dto_1 = require("./dto/order-filter.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const user_entity_1 = require("../users/entities/user.entity");
let OrdersController = class OrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async createOrder(dto, user) {
        return await this.ordersService.createOrder(user, dto);
    }
    async getMyOrders(user, filters) {
        if (!user.customerProfile) {
            return { orders: [], total: 0 };
        }
        return await this.ordersService.findCustomerOrders(user.customerProfile.id, filters);
    }
    async getVendorOrders(user, filters) {
        if (!user.vendorProfile) {
            return { orders: [], total: 0 };
        }
        return await this.ordersService.findVendorOrders(user.vendorProfile.id, filters);
    }
    async getAllOrders(filters) {
        return await this.ordersService.findAllOrders(filters);
    }
    async getOrderGroup(orderGroupId, user) {
        const reqUser = user;
        return await this.ordersService.findOrdersByGroup(orderGroupId, reqUser.customerProfile?.id || reqUser.vendorProfile?.id || reqUser.id, reqUser.role);
    }
    async getOrder(id, user) {
        const reqUser = user;
        const order = await this.ordersService.findOne(id);
        if (reqUser.role === user_role_enum_1.UserRole.CUSTOMER) {
            if (order.customerId !== reqUser.customerProfile?.id) {
                throw new common_1.ForbiddenException('You can only view your own orders');
            }
        }
        else if (reqUser.role === user_role_enum_1.UserRole.VENDOR) {
            if (order.vendorId !== reqUser.vendorProfile?.id) {
                throw new common_1.ForbiddenException('You can only view orders for your products');
            }
        }
        else if (reqUser.role === user_role_enum_1.UserRole.RIDER) {
            if (order.riderId !== reqUser.riderProfile?.id) {
                throw new common_1.ForbiddenException('You can only view orders assigned to you');
            }
        }
        return order;
    }
    async updateOrderStatus(id, dto, user) {
        return await this.ordersService.updateOrderStatus(id, dto, user);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.CUSTOMER),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Place an order (checkout)', description: 'Roles: customer. Cart is read from Redis — no prices in body.' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Order(s) created' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden — not a customer' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.CreateOrderDto, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "createOrder", null);
__decorate([
    (0, common_1.Get)('my-orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.CUSTOMER),
    (0, swagger_1.ApiOperation)({ summary: "Get customer's order history", description: 'Roles: customer' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated order list' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        order_filter_dto_1.OrderFilterDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getMyOrders", null);
__decorate([
    (0, common_1.Get)('vendor-orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR),
    (0, swagger_1.ApiOperation)({ summary: "Get vendor's incoming orders", description: 'Roles: vendor' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated vendor order list' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        order_filter_dto_1.OrderFilterDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getVendorOrders", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List all orders (admin)', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'All orders with filters' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [order_filter_dto_1.OrderFilterDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getAllOrders", null);
__decorate([
    (0, common_1.Get)('group/:orderGroupId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get all orders from one checkout (multi-vendor)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Orders in the group' }),
    __param(0, (0, common_1.Param)('orderGroupId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrderGroup", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single order by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Order detail' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden — not your order' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrder", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR, user_role_enum_1.UserRole.CUSTOMER, user_role_enum_1.UserRole.RIDER, user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update order status', description: 'Roles: all. State machine enforces valid transitions per role.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated order' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Invalid transition for your role' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_order_status_dto_1.UpdateOrderStatusDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateOrderStatus", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiTags)('Orders'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({
        path: 'orders',
        version: '1',
    }),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map