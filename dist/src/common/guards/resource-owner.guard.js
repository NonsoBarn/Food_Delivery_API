"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceOwnerGuard = void 0;
const common_1 = require("@nestjs/common");
const user_role_enum_1 = require("../enums/user-role.enum");
let ResourceOwnerGuard = class ResourceOwnerGuard {
    canActivate(context) {
        const request = context
            .switchToHttp()
            .getRequest();
        const { user, params, body } = request;
        if (user.role === user_role_enum_1.UserRole.ADMIN) {
            return true;
        }
        const resourceOwnerId = params.userId ?? body.userId;
        if (!resourceOwnerId || user.id !== resourceOwnerId) {
            throw new common_1.ForbiddenException('You can only access your own resources');
        }
        return true;
    }
};
exports.ResourceOwnerGuard = ResourceOwnerGuard;
exports.ResourceOwnerGuard = ResourceOwnerGuard = __decorate([
    (0, common_1.Injectable)()
], ResourceOwnerGuard);
//# sourceMappingURL=resource-owner.guard.js.map