"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionChecker = void 0;
const common_1 = require("@nestjs/common");
const user_role_enum_1 = require("../enums/user-role.enum");
class PermissionChecker {
    static hasRole(userRole, requiredRoles) {
        return requiredRoles.includes(userRole);
    }
    static ensureRole(userRole, requiredRoles) {
        if (!this.hasRole(userRole, requiredRoles)) {
            throw new common_1.ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
        }
    }
    static isAdmin(userRole) {
        return userRole === user_role_enum_1.UserRole.ADMIN;
    }
    static isOwner(userId, resourceOwnerId) {
        return userId === resourceOwnerId;
    }
    static isOwnerOrAdmin(userId, userRole, resourceOwnerId) {
        return this.isOwner(userId, resourceOwnerId) || this.isAdmin(userRole);
    }
}
exports.PermissionChecker = PermissionChecker;
//# sourceMappingURL=permission-checker.util.js.map