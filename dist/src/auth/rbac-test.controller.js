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
exports.RbacTestController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const api_versions_1 = require("../common/constants/api-versions");
let RbacTestController = class RbacTestController {
    publicRoute(user) {
        return {
            message: 'This route is accessible to all authenticated users',
            user,
        };
    }
    customerOnly(user) {
        return {
            message: 'This route is only for customers',
            user,
        };
    }
    vendorOnly(user) {
        return {
            message: 'This route is only for vendors',
            user,
        };
    }
    riderOnly(user) {
        return {
            message: 'This route is only for riders',
            user,
        };
    }
    adminOnly(user) {
        return {
            message: 'This route is only for admins',
            user,
        };
    }
    vendorOrAdmin(user) {
        return {
            message: 'This route is for vendors or admins',
            user,
        };
    }
    notCustomer(user) {
        return {
            message: 'This route is for vendors, riders, or admins',
            user,
        };
    }
};
exports.RbacTestController = RbacTestController;
__decorate([
    (0, common_1.Get)('public'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RbacTestController.prototype, "publicRoute", null);
__decorate([
    (0, common_1.Get)('customer-only'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.CUSTOMER),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RbacTestController.prototype, "customerOnly", null);
__decorate([
    (0, common_1.Get)('vendor-only'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RbacTestController.prototype, "vendorOnly", null);
__decorate([
    (0, common_1.Get)('rider-only'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.RIDER),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RbacTestController.prototype, "riderOnly", null);
__decorate([
    (0, common_1.Get)('admin-only'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RbacTestController.prototype, "adminOnly", null);
__decorate([
    (0, common_1.Get)('vendor-or-admin'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR, user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RbacTestController.prototype, "vendorOrAdmin", null);
__decorate([
    (0, common_1.Get)('not-customer'),
    (0, common_1.Version)(api_versions_1.API_VERSIONS.V1),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR, user_role_enum_1.UserRole.RIDER, user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RbacTestController.prototype, "notCustomer", null);
exports.RbacTestController = RbacTestController = __decorate([
    (0, common_1.Controller)('rbac-test'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)
], RbacTestController);
//# sourceMappingURL=rbac-test.controller.js.map