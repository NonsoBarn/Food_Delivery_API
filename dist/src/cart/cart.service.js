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
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ioredis_1 = __importDefault(require("ioredis"));
const product_entity_1 = require("../products/entities/product.entity");
const product_status_enum_1 = require("../products/enums/product-status.enum");
let CartService = class CartService {
    redis;
    productRepository;
    CART_TTL_AUTH = 30 * 24 * 60 * 60;
    CART_TTL_ANON = 7 * 24 * 60 * 60;
    constructor(redis, productRepository) {
        this.redis = redis;
        this.productRepository = productRepository;
    }
    async addToCart(userId, dto, isAuthenticated) {
        const { productId, quantity } = dto;
        const product = await this.productRepository.findOne({
            where: { id: productId },
            relations: ['vendor', 'images'],
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${productId} not found`);
        }
        if (product.status !== product_status_enum_1.ProductStatus.PUBLISHED) {
            throw new common_1.BadRequestException(`Product "${product.name}" is not available for purchase`);
        }
        if (product.stock !== -1) {
            const existingItem = await this.getCartItem(userId, productId);
            const currentQuantity = existingItem?.quantity || 0;
            const newTotalQuantity = currentQuantity + quantity;
            if (newTotalQuantity > product.stock) {
                throw new common_1.BadRequestException(`Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${newTotalQuantity}`);
            }
        }
        const primaryImage = product.images?.find((img) => img.isPrimary);
        const cartKey = this.getCartKey(userId, isAuthenticated);
        const existingItem = await this.getCartItem(userId, productId);
        const cartItem = {
            productId: product.id,
            vendorId: product.vendorId,
            vendorName: product.vendor.businessName,
            name: product.name,
            slug: product.slug,
            price: Number(product.price),
            quantity: existingItem ? existingItem.quantity + quantity : quantity,
            imageUrl: primaryImage?.imageUrl || null,
            maxQuantity: product.stock,
            status: product.status,
            addedAt: existingItem?.addedAt || new Date().toISOString(),
        };
        await this.redis.hset(cartKey, productId, JSON.stringify(cartItem));
        const ttl = isAuthenticated ? this.CART_TTL_AUTH : this.CART_TTL_ANON;
        await this.redis.expire(cartKey, ttl);
        return await this.getCart(userId, isAuthenticated);
    }
    async getCart(userId, isAuthenticated) {
        const cartKey = this.getCartKey(userId, isAuthenticated);
        const itemsHash = await this.redis.hgetall(cartKey);
        const items = Object.values(itemsHash).map((itemStr) => JSON.parse(itemStr));
        items.forEach((item) => {
            item.subtotal = item.price * item.quantity;
        });
        const itemsByVendor = {};
        items.forEach((item) => {
            if (!itemsByVendor[item.vendorId]) {
                itemsByVendor[item.vendorId] = {
                    vendorName: item.vendorName,
                    items: [],
                    subtotal: 0,
                };
            }
            itemsByVendor[item.vendorId].items.push(item);
            itemsByVendor[item.vendorId].subtotal += item.subtotal || 0;
        });
        const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const hasUnavailableItems = items.some((item) => item.status === product_status_enum_1.ProductStatus.OUT_OF_STOCK ||
            item.status === product_status_enum_1.ProductStatus.INACTIVE);
        return {
            items,
            itemsByVendor,
            totalItems,
            totalProducts: items.length,
            subtotal: Number(subtotal.toFixed(2)),
            tax: 0,
            shipping: 0,
            total: Number(subtotal.toFixed(2)),
            isEmpty: items.length === 0,
            hasUnavailableItems,
        };
    }
    async updateCartItem(userId, productId, dto, isAuthenticated) {
        const { quantity } = dto;
        if (quantity === 0) {
            return await this.removeFromCart(userId, productId, isAuthenticated);
        }
        const cartKey = this.getCartKey(userId, isAuthenticated);
        const existingItem = await this.getCartItem(userId, productId);
        if (!existingItem) {
            throw new common_1.NotFoundException(`Product ${productId} not found in cart`);
        }
        if (existingItem.maxQuantity !== -1 &&
            quantity > existingItem.maxQuantity) {
            throw new common_1.BadRequestException(`Insufficient stock for "${existingItem.name}". Available: ${existingItem.maxQuantity}`);
        }
        existingItem.quantity = quantity;
        existingItem.subtotal = existingItem.price * quantity;
        await this.redis.hset(cartKey, productId, JSON.stringify(existingItem));
        return await this.getCart(userId, isAuthenticated);
    }
    async removeFromCart(userId, productId, isAuthenticated) {
        const cartKey = this.getCartKey(userId, isAuthenticated);
        const exists = await this.redis.hexists(cartKey, productId);
        if (!exists) {
            throw new common_1.NotFoundException(`Product ${productId} not found in cart`);
        }
        await this.redis.hdel(cartKey, productId);
        return await this.getCart(userId, isAuthenticated);
    }
    async clearCart(userId, isAuthenticated) {
        const cartKey = this.getCartKey(userId, isAuthenticated);
        await this.redis.del(cartKey);
    }
    async migrateCart(sessionId, userId) {
        const sessionKey = this.getCartKey(sessionId, false);
        const userKey = this.getCartKey(userId, true);
        const sessionItems = await this.redis.hgetall(sessionKey);
        if (Object.keys(sessionItems).length === 0) {
            return await this.getCart(userId, true);
        }
        const userItems = await this.redis.hgetall(userKey);
        for (const [productId, itemStr] of Object.entries(sessionItems)) {
            const sessionItem = JSON.parse(itemStr);
            if (userItems[productId]) {
                const userItem = JSON.parse(userItems[productId]);
                const newQuantity = userItem.quantity + sessionItem.quantity;
                if (userItem.maxQuantity !== -1 && newQuantity > userItem.maxQuantity) {
                    userItem.quantity = userItem.maxQuantity;
                }
                else {
                    userItem.quantity = newQuantity;
                }
                await this.redis.hset(userKey, productId, JSON.stringify(userItem));
            }
            else {
                await this.redis.hset(userKey, productId, itemStr);
            }
        }
        await this.redis.expire(userKey, this.CART_TTL_AUTH);
        await this.redis.del(sessionKey);
        return await this.getCart(userId, true);
    }
    async validateCart(userId) {
        const cart = await this.getCart(userId, true);
        const errors = [];
        const warnings = [];
        for (const item of cart.items) {
            const product = await this.productRepository.findOne({
                where: { id: item.productId },
            });
            if (!product) {
                errors.push(`Product "${item.name}" no longer exists`);
                continue;
            }
            if (product.status !== product_status_enum_1.ProductStatus.PUBLISHED) {
                errors.push(`Product "${item.name}" is no longer available`);
                continue;
            }
            if (product.stock !== -1 && item.quantity > product.stock) {
                errors.push(`Insufficient stock for "${item.name}". Available: ${product.stock}, In cart: ${item.quantity}`);
            }
            if (Number(product.price) !== item.price) {
                warnings.push(`Price changed for "${item.name}". Was $${item.price}, now $${product.price}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    getCartKey(userId, isAuthenticated) {
        return isAuthenticated ? `cart:user:${userId}` : `cart:session:${userId}`;
    }
    async getCartItem(userId, productId) {
        let cartKey = this.getCartKey(userId, true);
        let itemStr = await this.redis.hget(cartKey, productId);
        if (!itemStr) {
            cartKey = this.getCartKey(userId, false);
            itemStr = await this.redis.hget(cartKey, productId);
        }
        return itemStr ? JSON.parse(itemStr) : null;
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __param(1, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [ioredis_1.default,
        typeorm_2.Repository])
], CartService);
//# sourceMappingURL=cart.service.js.map