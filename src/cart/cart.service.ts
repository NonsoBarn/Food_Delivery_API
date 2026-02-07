/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Product } from '../products/entities/product.entity';
import { CartItem, CartSummary } from './interfaces/cart-item.interface';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ProductStatus } from '../products/enums/product-status.enum';

/**
 * Cart Service
 *
 * Manages shopping cart operations using Redis.
 *
 * Architecture:
 * - Redis: Fast in-memory storage
 * - Denormalized data: Copy product details for speed
 * - TTL: Auto-expire carts (30 days auth, 7 days anon)
 *
 * Key Pattern:
 * - cart:user:{userId} - Authenticated users
 * - cart:session:{sessionId} - Anonymous users
 *
 * Data Structure (Redis Hash):
 * {
 *   "product-id-1": JSON.stringify(CartItem),
 *   "product-id-2": JSON.stringify(CartItem),
 * }
 */
@Injectable()
export class CartService {
  private readonly CART_TTL_AUTH = 30 * 24 * 60 * 60; // 30 days
  private readonly CART_TTL_ANON = 7 * 24 * 60 * 60; // 7 days

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Add item to cart
   *
   * Flow:
   * 1. Fetch product from database
   * 2. Validate product (published, in stock)
   * 3. Check if item already in cart
   * 4. Add/update quantity
   * 5. Set TTL on cart
   * 6. Return updated cart
   *
   * @param userId - User ID or session ID
   * @param dto - Product and quantity
   * @param isAuthenticated - True if user logged in
   * @returns Updated cart summary
   */
  async addToCart(
    userId: string,
    dto: AddToCartDto,
    isAuthenticated: boolean,
  ): Promise<CartSummary> {
    const { productId, quantity } = dto;

    // Step 1: Fetch product with all details
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['vendor', 'images'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Step 2: Validate product availability
    if (product.status !== ProductStatus.PUBLISHED) {
      throw new BadRequestException(
        `Product "${product.name}" is not available for purchase`,
      );
    }

    // Step 3: Check stock availability
    if (product.stock !== -1) {
      // -1 = unlimited stock, skip check
      const existingItem = await this.getCartItem(userId, productId);
      const currentQuantity = existingItem?.quantity || 0;
      const newTotalQuantity = currentQuantity + quantity;

      if (newTotalQuantity > product.stock) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${newTotalQuantity}`,
        );
      }
    }

    // Step 4: Get primary image
    const primaryImage = product.images?.find((img) => img.isPrimary);

    // Step 5: Create/update cart item
    const cartKey = this.getCartKey(userId, isAuthenticated);
    const existingItem = await this.getCartItem(userId, productId);

    const cartItem: CartItem = {
      productId: product.id,
      vendorId: product.vendorId,
      vendorName: product.vendor.businessName,
      name: product.name,
      slug: product.slug,
      price: Number(product.price), // Freeze price at time of add
      quantity: existingItem ? existingItem.quantity + quantity : quantity,
      imageUrl: primaryImage?.imageUrl || null,
      maxQuantity: product.stock,
      status: product.status,
      addedAt: existingItem?.addedAt || new Date().toISOString(),
    };

    // Step 6: Save to Redis
    await this.redis.hset(cartKey, productId, JSON.stringify(cartItem));

    // Step 7: Set TTL
    const ttl = isAuthenticated ? this.CART_TTL_AUTH : this.CART_TTL_ANON;
    await this.redis.expire(cartKey, ttl);

    // Step 8: Return updated cart
    return await this.getCart(userId, isAuthenticated);
  }

  /**
   * Get cart contents
   *
   * Flow:
   * 1. Fetch all items from Redis
   * 2. Parse JSON strings to CartItem objects
   * 3. Re-validate product availability (optional)
   * 4. Group by vendor
   * 5. Calculate totals
   * 6. Return cart summary
   *
   * @param userId - User ID or session ID
   * @param isAuthenticated - True if user logged in
   * @returns Cart summary with items and totals
   */
  async getCart(
    userId: string,
    isAuthenticated: boolean,
  ): Promise<CartSummary> {
    const cartKey = this.getCartKey(userId, isAuthenticated);

    // Fetch all cart items
    const itemsHash = await this.redis.hgetall(cartKey);

    // Parse items
    const items: CartItem[] = Object.values(itemsHash).map((itemStr) =>
      JSON.parse(itemStr as string),
    );

    // Calculate subtotals
    items.forEach((item) => {
      item.subtotal = item.price * item.quantity;
    });

    // Group by vendor
    const itemsByVendor: CartSummary['itemsByVendor'] = {};
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

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const hasUnavailableItems = items.some(
      (item) =>
        item.status === ProductStatus.OUT_OF_STOCK ||
        item.status === ProductStatus.INACTIVE,
    );

    return {
      items,
      itemsByVendor,
      totalItems,
      totalProducts: items.length,
      subtotal: Number(subtotal.toFixed(2)),
      tax: 0, // Future feature
      shipping: 0, // Future feature
      total: Number(subtotal.toFixed(2)),
      isEmpty: items.length === 0,
      hasUnavailableItems,
    };
  }

  /**
   * Update cart item quantity
   *
   * Special behavior:
   * - quantity = 0: Remove item
   * - quantity > 0: Update quantity
   *
   * @param userId - User ID or session ID
   * @param productId - Product to update
   * @param dto - New quantity
   * @param isAuthenticated - True if user logged in
   * @returns Updated cart summary
   */
  async updateCartItem(
    userId: string,
    productId: string,
    dto: UpdateCartItemDto,
    isAuthenticated: boolean,
  ): Promise<CartSummary> {
    const { quantity } = dto;

    // Special case: quantity = 0 means remove
    if (quantity === 0) {
      return await this.removeFromCart(userId, productId, isAuthenticated);
    }

    const cartKey = this.getCartKey(userId, isAuthenticated);

    // Check if item exists in cart
    const existingItem = await this.getCartItem(userId, productId);
    if (!existingItem) {
      throw new NotFoundException(`Product ${productId} not found in cart`);
    }

    // Validate new quantity against stock
    if (
      existingItem.maxQuantity !== -1 &&
      quantity > existingItem.maxQuantity
    ) {
      throw new BadRequestException(
        `Insufficient stock for "${existingItem.name}". Available: ${existingItem.maxQuantity}`,
      );
    }

    // Update quantity
    existingItem.quantity = quantity;
    existingItem.subtotal = existingItem.price * quantity;

    // Save to Redis
    await this.redis.hset(cartKey, productId, JSON.stringify(existingItem));

    // Return updated cart
    return await this.getCart(userId, isAuthenticated);
  }

  /**
   * Remove item from cart
   *
   * @param userId - User ID or session ID
   * @param productId - Product to remove
   * @param isAuthenticated - True if user logged in
   * @returns Updated cart summary
   */
  async removeFromCart(
    userId: string,
    productId: string,
    isAuthenticated: boolean,
  ): Promise<CartSummary> {
    const cartKey = this.getCartKey(userId, isAuthenticated);

    // Check if item exists
    const exists = await this.redis.hexists(cartKey, productId);
    if (!exists) {
      throw new NotFoundException(`Product ${productId} not found in cart`);
    }

    // Remove from Redis
    await this.redis.hdel(cartKey, productId);

    // Return updated cart
    return await this.getCart(userId, isAuthenticated);
  }

  /**
   * Clear entire cart
   *
   * @param userId - User ID or session ID
   * @param isAuthenticated - True if user logged in
   */
  async clearCart(userId: string, isAuthenticated: boolean): Promise<void> {
    const cartKey = this.getCartKey(userId, isAuthenticated);
    await this.redis.del(cartKey);
  }

  /**
   * Migrate anonymous cart to authenticated user
   *
   * Called when user logs in.
   * Merges session cart into user cart.
   *
   * Strategy:
   * 1. Get both carts
   * 2. For each item in session cart:
   *    - If not in user cart: add it
   *    - If in user cart: add quantities
   * 3. Delete session cart
   *
   * @param sessionId - Anonymous session ID
   * @param userId - Authenticated user ID
   */
  async migrateCart(sessionId: string, userId: string): Promise<CartSummary> {
    const sessionKey = this.getCartKey(sessionId, false);
    const userKey = this.getCartKey(userId, true);

    // Get session cart items
    const sessionItems = await this.redis.hgetall(sessionKey);

    if (Object.keys(sessionItems).length === 0) {
      // No session cart, return user cart
      return await this.getCart(userId, true);
    }

    // Get user cart items
    const userItems = await this.redis.hgetall(userKey);

    // Merge carts
    for (const [productId, itemStr] of Object.entries(sessionItems)) {
      const sessionItem: CartItem = JSON.parse(itemStr as string);

      if (userItems[productId]) {
        // Item exists in both carts, add quantities
        const userItem: CartItem = JSON.parse(userItems[productId]);
        const newQuantity = userItem.quantity + sessionItem.quantity;

        // Check stock
        if (userItem.maxQuantity !== -1 && newQuantity > userItem.maxQuantity) {
          // Cap at max stock
          userItem.quantity = userItem.maxQuantity;
        } else {
          userItem.quantity = newQuantity;
        }

        await this.redis.hset(userKey, productId, JSON.stringify(userItem));
      } else {
        // Item only in session cart, copy to user cart
        await this.redis.hset(userKey, productId, itemStr);
      }
    }

    // Set TTL on user cart
    await this.redis.expire(userKey, this.CART_TTL_AUTH);

    // Delete session cart
    await this.redis.del(sessionKey);

    // Return merged cart
    return await this.getCart(userId, true);
  }

  /**
   * Validate cart before checkout
   *
   * Re-checks:
   * - Product still exists
   * - Product still published
   * - Stock still available
   * - Price hasn't changed (optional warning)
   *
   * @param userId - User ID
   * @returns Validation result with errors/warnings
   */
  async validateCart(userId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const cart = await this.getCart(userId, true);
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const item of cart.items) {
      // Check if product still exists
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });

      if (!product) {
        errors.push(`Product "${item.name}" no longer exists`);
        continue;
      }

      // Check if still published
      if (product.status !== ProductStatus.PUBLISHED) {
        errors.push(`Product "${item.name}" is no longer available`);
        continue;
      }

      // Check stock
      if (product.stock !== -1 && item.quantity > product.stock) {
        errors.push(
          `Insufficient stock for "${item.name}". Available: ${product.stock}, In cart: ${item.quantity}`,
        );
      }

      // Check price changes (warning only)
      if (Number(product.price) !== item.price) {
        warnings.push(
          `Price changed for "${item.name}". Was $${item.price}, now $${product.price}`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Helper: Get cart key for Redis
   *
   * @param userId - User ID or session ID
   * @param isAuthenticated - True if user logged in
   * @returns Redis key
   */
  private getCartKey(userId: string, isAuthenticated: boolean): string {
    return isAuthenticated ? `cart:user:${userId}` : `cart:session:${userId}`;
  }

  /**
   * Helper: Get single cart item
   *
   * @param userId - User ID or session ID
   * @param productId - Product ID
   * @returns CartItem or null
   */
  private async getCartItem(
    userId: string,
    productId: string,
  ): Promise<CartItem | null> {
    // Try authenticated first, then anonymous
    let cartKey = this.getCartKey(userId, true);
    let itemStr = await this.redis.hget(cartKey, productId);

    if (!itemStr) {
      cartKey = this.getCartKey(userId, false);
      itemStr = await this.redis.hget(cartKey, productId);
    }

    return itemStr ? JSON.parse(itemStr) : null;
  }
}
