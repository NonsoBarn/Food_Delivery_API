import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Product } from '../products/entities/product.entity';
import { CartSummary } from './interfaces/cart-item.interface';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
export declare class CartService {
    private readonly redis;
    private readonly productRepository;
    private readonly CART_TTL_AUTH;
    private readonly CART_TTL_ANON;
    constructor(redis: Redis, productRepository: Repository<Product>);
    addToCart(userId: string, dto: AddToCartDto, isAuthenticated: boolean): Promise<CartSummary>;
    getCart(userId: string, isAuthenticated: boolean): Promise<CartSummary>;
    updateCartItem(userId: string, productId: string, dto: UpdateCartItemDto, isAuthenticated: boolean): Promise<CartSummary>;
    removeFromCart(userId: string, productId: string, isAuthenticated: boolean): Promise<CartSummary>;
    clearCart(userId: string, isAuthenticated: boolean): Promise<void>;
    migrateCart(sessionId: string, userId: string): Promise<CartSummary>;
    validateCart(userId: string): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    private getCartKey;
    private getCartItem;
}
