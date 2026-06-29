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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartController = void 0;
const common_1 = require("@nestjs/common");
const express_1 = __importDefault(require("express"));
const swagger_1 = require("@nestjs/swagger");
const cart_service_1 = require("./cart.service");
const add_to_cart_dto_1 = require("./dto/add-to-cart.dto");
const update_cart_item_dto_1 = require("./dto/update-cart-item.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const optional_jwt_auth_guard_1 = require("../auth/guards/optional-jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_entity_1 = require("../users/entities/user.entity");
let CartController = class CartController {
    cartService;
    constructor(cartService) {
        this.cartService = cartService;
    }
    async addToCart(dto, req, user) {
        const isAuthenticated = !!user;
        const userId = isAuthenticated ? user.id : this.getSessionId(req);
        return await this.cartService.addToCart(userId, dto, isAuthenticated);
    }
    async getCart(req, user) {
        const isAuthenticated = !!user;
        const userId = isAuthenticated ? user.id : this.getSessionId(req);
        return await this.cartService.getCart(userId, isAuthenticated);
    }
    async updateCartItem(productId, dto, req, user) {
        const isAuthenticated = !!user;
        const userId = isAuthenticated ? user.id : this.getSessionId(req);
        return await this.cartService.updateCartItem(userId, productId, dto, isAuthenticated);
    }
    async removeFromCart(productId, req, user) {
        const isAuthenticated = !!user;
        const userId = isAuthenticated ? user.id : this.getSessionId(req);
        return await this.cartService.removeFromCart(userId, productId, isAuthenticated);
    }
    async clearCart(req, user) {
        const isAuthenticated = !!user;
        const userId = isAuthenticated ? user.id : this.getSessionId(req);
        await this.cartService.clearCart(userId, isAuthenticated);
    }
    async migrateCart(req, user) {
        const sessionId = this.getSessionId(req);
        const userId = user.id;
        return await this.cartService.migrateCart(sessionId, userId);
    }
    async validateCart(user) {
        return await this.cartService.validateCart(user.id);
    }
    getSessionId(req) {
        const headerSessionId = req.headers['x-session-id'];
        if (headerSessionId) {
            return headerSessionId;
        }
        const cookies = req.cookies;
        if (cookies) {
            const session = cookies['sessionId'];
            if (typeof session === 'string' && session) {
                return session;
            }
        }
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.CartController = CartController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Add item to cart', description: 'Auth optional. Use X-Session-Id header for anonymous carts.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated cart' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [add_to_cart_dto_1.AddToCartDto, Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "addToCart", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get cart contents', description: 'Auth optional.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cart with items, totals, and vendor groups' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "getCart", null);
__decorate([
    (0, common_1.Patch)(':productId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update cart item quantity (0 = remove)', description: 'Auth optional.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated cart' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_cart_item_dto_1.UpdateCartItemDto, Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "updateCartItem", null);
__decorate([
    (0, common_1.Delete)(':productId'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove item from cart', description: 'Auth optional.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated cart' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "removeFromCart", null);
__decorate([
    (0, common_1.Delete)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Clear the entire cart', description: 'Auth optional.' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Cart cleared' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "clearCart", null);
__decorate([
    (0, common_1.Post)('migrate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Migrate anonymous cart to authenticated user', description: 'Call after login. Requires X-Session-Id header with old session ID.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Merged cart' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "migrateCart", null);
__decorate([
    (0, common_1.Post)('validate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Validate cart before checkout', description: 'Checks stock, availability, and price changes.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '{ valid, errors, warnings }' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "validateCart", null);
exports.CartController = CartController = __decorate([
    (0, swagger_1.ApiTags)('Cart'),
    (0, common_1.Controller)({
        path: 'cart',
        version: '1',
    }),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __metadata("design:paramtypes", [cart_service_1.CartService])
], CartController);
//# sourceMappingURL=cart.controller.js.map