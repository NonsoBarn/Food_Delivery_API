/**
 * ReviewsController
 *
 * HTTP routes for the reviews system.
 * Base path: /api/v1/reviews
 *
 * Endpoint Summary:
 * ┌────────┬──────────────────────────────┬────────────┬────────────────────────────────┐
 * │ Method │ Route                        │ Auth       │ Description                    │
 * ├────────┼──────────────────────────────┼────────────┼────────────────────────────────┤
 * │ POST   │ /products/:productId         │ CUSTOMER   │ Submit a product review        │
 * │ GET    │ /products/:productId         │ Public     │ Get reviews for a product      │
 * │ POST   │ /vendors/:vendorId           │ CUSTOMER   │ Rate a vendor (with orderId)   │
 * │ GET    │ /vendors/:vendorId           │ Public     │ Get reviews for a vendor       │
 * └────────┴──────────────────────────────┴────────────┴────────────────────────────────┘
 *
 * KEY LEARNING: Mixed public/protected endpoints in one controller
 * ================================================================
 * Some routes are public (GET reviews) and some are protected (POST reviews).
 * We can't put @UseGuards at the class level because that would apply to ALL routes.
 *
 * Solution: Apply @UseGuards only on the routes that need it.
 * Public routes have NO @UseGuards, NO @Roles — they're open to everyone.
 *
 * This is more flexible than "all or nothing" class-level guards.
 *
 * KEY LEARNING: @HttpCode(HttpStatus.CREATED)
 * ============================================
 * By default, NestJS returns 200 OK for all successful responses.
 * POST requests that CREATE a resource should return 201 Created.
 * @HttpCode(HttpStatus.CREATED) overrides the default for that specific route.
 */
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { CreateVendorReviewDto } from './dto/create-vendor-review.dto';
import { ReviewFilterDto } from './dto/review-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@Controller({
  path: 'reviews',
  version: '1',
})
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ================================================================
  // PRODUCT REVIEWS
  // ================================================================

  /**
   * POST /api/v1/reviews/products/:productId
   *
   * Customers submit a star rating + optional comment for a product.
   *
   * Guard stack:
   *   JwtAuthGuard → validates the Bearer token, populates @CurrentUser
   *   RolesGuard   → checks the user's role matches @Roles(CUSTOMER)
   *
   * @Param('productId') — extracts the UUID from the URL path
   * @CurrentUser() — injects the authenticated User entity (from JWT payload)
   * @Body() — the validated DTO (rating + comment)
   *
   * The service receives user.id (User.id), then internally looks up
   * the CustomerProfile to get the customerId for the review.
   */
  @Post('products/:productId')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async createProductReview(
    @Param('productId') productId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateProductReviewDto,
  ) {
    const review = await this.reviewsService.createProductReview(
      productId,
      user.id,
      dto,
    );
    return {
      message: 'Review submitted successfully',
      review,
    };
  }

  /**
   * GET /api/v1/reviews/products/:productId?page=1&limit=20&rating=5
   *
   * Public endpoint — no authentication required.
   * Returns paginated reviews with the product's average rating.
   *
   * Why public?
   * Product pages on food delivery apps are visible to anyone browsing,
   * even before they log in. Reviews build trust and drive conversions.
   *
   * @Query() with ReviewFilterDto — NestJS uses class-transformer to
   * convert query string params to the DTO object. @Type(() => Number)
   * in the DTO handles the string-to-number conversion for page/limit/rating.
   */
  @Get('products/:productId')
  async getProductReviews(
    @Param('productId') productId: string,
    @Query() filters: ReviewFilterDto,
  ) {
    const { reviews, total, averageRating } =
      await this.reviewsService.getProductReviews(productId, filters);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        // Math.ceil(10 / 3) = 4 pages for 10 items at 3/page
        totalPages: Math.ceil(total / limit),
        averageRating,
      },
    };
  }

  // ================================================================
  // VENDOR REVIEWS
  // ================================================================

  /**
   * POST /api/v1/reviews/vendors/:vendorId
   *
   * Customers rate a vendor after a delivered order.
   *
   * The DTO includes orderId — which is:
   * 1. Proof of purchase (verified in service)
   * 2. The key for the unique constraint (one rating per order)
   *
   * Same guard pattern as product reviews: JWT + CUSTOMER role only.
   */
  @Post('vendors/:vendorId')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async createVendorReview(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateVendorReviewDto,
  ) {
    const review = await this.reviewsService.createVendorReview(
      vendorId,
      user.id,
      dto,
    );
    return {
      message: 'Vendor rated successfully',
      review,
    };
  }

  /**
   * GET /api/v1/reviews/vendors/:vendorId?page=1&limit=20&rating=4
   *
   * Public endpoint — returns paginated vendor reviews and the vendor's
   * overall average rating. Displayed on the vendor's menu/store page.
   */
  @Get('vendors/:vendorId')
  async getVendorReviews(
    @Param('vendorId') vendorId: string,
    @Query() filters: ReviewFilterDto,
  ) {
    const { reviews, total, averageRating } =
      await this.reviewsService.getVendorReviews(vendorId, filters);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        averageRating,
      },
    };
  }
}
