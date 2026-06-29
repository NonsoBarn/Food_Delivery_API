import express from 'express';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { User } from 'src/users/entities/user.entity';
export declare class CartController {
    private readonly cartService;
    constructor(cartService: CartService);
    addToCart(dto: AddToCartDto, req: express.Request, user?: User): Promise<import("./interfaces/cart-item.interface").CartSummary>;
    getCart(req: express.Request, user?: User): Promise<import("./interfaces/cart-item.interface").CartSummary>;
    updateCartItem(productId: string, dto: UpdateCartItemDto, req: express.Request, user?: User): Promise<import("./interfaces/cart-item.interface").CartSummary>;
    removeFromCart(productId: string, req: express.Request, user?: User): Promise<import("./interfaces/cart-item.interface").CartSummary>;
    clearCart(req: express.Request, user?: User): Promise<void>;
    migrateCart(req: express.Request, user: User): Promise<import("./interfaces/cart-item.interface").CartSummary>;
    validateCart(user: User): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    private getSessionId;
}
