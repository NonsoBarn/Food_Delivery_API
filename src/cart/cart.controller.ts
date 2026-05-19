import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import express from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';

/**
 * Cart Controller
 *
 * Handles shopping cart operations.
 * Routes: /api/v1/cart
 *
 * Authentication Strategy:
 * - Optional auth (works for both anonymous and authenticated)
 * - Anonymous: Uses session ID from cookie/header
 * - Authenticated: Uses user ID from JWT token
 *
 * Cart Migration:
 * - When user logs in, anonymous cart migrated to user cart
 */
@ApiTags('Cart')
@Controller({
  path: 'cart',
  version: '1',
})
@UseGuards(OptionalJwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Add item to cart
   *
   * POST /api/v1/cart
   * Authorization: Optional (works for anonymous and authenticated)
   *
   * Flow:
   * 1. Extract user ID (from JWT) or session ID (from header)
   * 2. Validate product and stock
   * 3. Add to cart (or increment quantity if exists)
   * 4. Return updated cart
   *
   * Request:
   * {
   *   "productId": "uuid",
   *   "quantity": 2
   * }
   *
   * Headers:
   * - Authorization: Bearer <token> (optional)
   * - X-Session-Id: <session-id> (if not authenticated)
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add item to cart', description: 'Auth optional. Use X-Session-Id header for anonymous carts.' })
  @ApiResponse({ status: 200, description: 'Updated cart' })
  async addToCart(
    @Body() dto: AddToCartDto,
    @Req() req: express.Request,
    @CurrentUser() user?: User,
  ) {
    // Determine if user is authenticated
    const isAuthenticated = !!user;

    // Get user ID or session ID
    const userId = isAuthenticated ? user.id : this.getSessionId(req);

    return await this.cartService.addToCart(userId, dto, isAuthenticated);
  }

  /**
   * Get cart contents
   *
   * GET /api/v1/cart
   * Authorization: Optional
   *
   * Returns:
   * - All cart items
   * - Items grouped by vendor
   * - Totals (subtotal, tax, shipping, total)
   * - Item count
   */
  @Get()
  @ApiOperation({ summary: 'Get cart contents', description: 'Auth optional.' })
  @ApiResponse({ status: 200, description: 'Cart with items, totals, and vendor groups' })
  async getCart(@Req() req: express.Request, @CurrentUser() user?: User) {
    const isAuthenticated = !!user;
    const userId = isAuthenticated ? user.id : this.getSessionId(req);

    return await this.cartService.getCart(userId, isAuthenticated);
  }

  /**
   * Update cart item quantity
   *
   * PATCH /api/v1/cart/:productId
   * Authorization: Optional
   *
   * Body:
   * {
   *   "quantity": 5  // New quantity (0 = remove)
   * }
   *
   * Special behavior:
   * - quantity = 0: Removes item from cart
   * - quantity > 0: Updates to new quantity
   */
  @Patch(':productId')
  @ApiOperation({ summary: 'Update cart item quantity (0 = remove)', description: 'Auth optional.' })
  @ApiResponse({ status: 200, description: 'Updated cart' })
  async updateCartItem(
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
    @Req() req: express.Request,
    @CurrentUser() user?: User,
  ) {
    const isAuthenticated = !!user;
    const userId = isAuthenticated ? user.id : this.getSessionId(req);

    return await this.cartService.updateCartItem(
      userId,
      productId,
      dto,
      isAuthenticated,
    );
  }

  /**
   * Remove item from cart
   *
   * DELETE /api/v1/cart/:productId
   * Authorization: Optional
   *
   * Response: 200 OK with updated cart
   */
  @Delete(':productId')
  @ApiOperation({ summary: 'Remove item from cart', description: 'Auth optional.' })
  @ApiResponse({ status: 200, description: 'Updated cart' })
  async removeFromCart(
    @Param('productId') productId: string,
    @Req() req: express.Request,
    @CurrentUser() user?: User,
  ) {
    const isAuthenticated = !!user;
    const userId = isAuthenticated ? user.id : this.getSessionId(req);

    return await this.cartService.removeFromCart(
      userId,
      productId,
      isAuthenticated,
    );
  }

  /**
   * Clear entire cart
   *
   * DELETE /api/v1/cart
   * Authorization: Optional
   *
   * Response: 204 No Content
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the entire cart', description: 'Auth optional.' })
  @ApiResponse({ status: 204, description: 'Cart cleared' })
  async clearCart(@Req() req: express.Request, @CurrentUser() user?: User) {
    const isAuthenticated = !!user;
    const userId = isAuthenticated ? user.id : this.getSessionId(req);

    await this.cartService.clearCart(userId, isAuthenticated);
  }

  /**
   * Migrate anonymous cart to authenticated user
   *
   * POST /api/v1/cart/migrate
   * Authorization: Required (must be authenticated)
   *
   * Called after user logs in.
   * Merges anonymous session cart into user cart.
   *
   * Headers:
   * - Authorization: Bearer <token> (required)
   * - X-Session-Id: <old-session-id> (required)
   */
  @Post('migrate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Migrate anonymous cart to authenticated user', description: 'Call after login. Requires X-Session-Id header with old session ID.' })
  @ApiResponse({ status: 200, description: 'Merged cart' })
  async migrateCart(@Req() req: express.Request, @CurrentUser() user: User) {
    const sessionId = this.getSessionId(req);
    const userId = user.id;

    return await this.cartService.migrateCart(sessionId, userId);
  }

  /**
   * Validate cart before checkout
   *
   * POST /api/v1/cart/validate
   * Authorization: Required
   *
   * Re-validates all items:
   * - Product still exists
   * - Product still available
   * - Stock sufficient
   * - Price changes (warnings)
   *
   * Response:
   * {
   *   "valid": true/false,
   *   "errors": [...],
   *   "warnings": [...]
   * }
   */
  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate cart before checkout', description: 'Checks stock, availability, and price changes.' })
  @ApiResponse({ status: 200, description: '{ valid, errors, warnings }' })
  async validateCart(@CurrentUser() user: User) {
    return await this.cartService.validateCart(user.id);
  }

  /**
   * Helper: Extract session ID
   *
   * Tries multiple sources:
   * 1. X-Session-Id header
   * 2. sessionId cookie
   * 3. Generate new UUID
   *
   * @param req - Express request
   * @returns Session ID
   */
  private getSessionId(req: express.Request): string {
    // Try header first
    const headerSessionId = req.headers['x-session-id'] as string;
    if (headerSessionId) {
      return headerSessionId;
    }

    // Try cookie
    const cookies = req.cookies as Record<string, unknown> | undefined;
    if (cookies) {
      const session = cookies['sessionId'];
      if (typeof session === 'string' && session) {
        return session;
      }
    }

    // Generate new session ID
    // In production, this should be handled by session middleware
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
