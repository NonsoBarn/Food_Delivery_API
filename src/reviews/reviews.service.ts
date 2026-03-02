/**
 * ReviewsService
 *
 * Business logic for creating and reading product and vendor reviews.
 *
 * TWO KEY PRINCIPLES demonstrated here:
 *
 * 1. PURCHASE VERIFICATION
 *    Before accepting a review, we prove the customer actually completed
 *    a purchase. This is what Amazon calls "Verified Purchase" and Uber Eats
 *    calls "Order confirmed." Without this, anyone could review anything.
 *
 * 2. RATING RECALCULATION WITH SQL AVG
 *    After saving a review, we recalculate the product/vendor's average rating
 *    using SQL's built-in AVG() function — not incremental math.
 *
 *    Why SQL AVG over incremental math?
 *    ------------------------------------
 *    Incremental approach: newAvg = ((oldAvg * count) + newRating) / (count + 1)
 *    Problem: Floating-point arithmetic accumulates rounding errors.
 *    After thousands of reviews, the stored average drifts from the true value.
 *
 *    SQL AVG approach: SELECT AVG(rating) FROM product_reviews WHERE productId = ?
 *    Problem: An extra DB read on every review write.
 *    Benefit: Always 100% accurate — recalculated from all raw integer ratings.
 *
 *    For a food delivery app at this scale, the extra DB read is negligible.
 *    In a high-write system (millions of reviews/second), you'd batch-recalculate
 *    on a schedule or use a CQRS pattern with an events-driven aggregator.
 *
 * TRANSACTIONS
 * Both create methods use dataSource.transaction() to ensure the review save
 * and the rating update happen atomically. If the rating update fails, the
 * review is rolled back — we never end up with a review that didn't update the score.
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProductReview } from './entities/product-review.entity';
import { VendorReview } from './entities/vendor-review.entity';
import { Product } from '../products/entities/product.entity';
import { VendorProfile } from '../users/entities/vendor-profile.entity';
import { CustomerProfile } from '../users/entities/customer-profile.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { CreateVendorReviewDto } from './dto/create-vendor-review.dto';
import { ReviewFilterDto } from './dto/review-filter.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(ProductReview)
    private readonly productReviewRepo: Repository<ProductReview>,

    @InjectRepository(VendorReview)
    private readonly vendorReviewRepo: Repository<VendorReview>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(VendorProfile)
    private readonly vendorProfileRepo: Repository<VendorProfile>,

    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepo: Repository<CustomerProfile>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    /**
     * DataSource gives us transaction capability.
     *
     * Why not use repositories for transactions?
     * Each repository uses its own DB connection from the connection pool.
     * A transaction needs ALL operations on the SAME connection.
     * dataSource.transaction() provides a single `EntityManager` bound to
     * one connection, so all operations inside are grouped as one atomic unit.
     */
    private readonly dataSource: DataSource,
  ) {}

  // ================================================================
  // SECTION 1: PRODUCT REVIEWS
  // ================================================================

  /**
   * Create a product review.
   *
   * Flow:
   * 1. Resolve the customer profile from the userId (JWT gives us userId, not profileId)
   * 2. Verify the product exists
   * 3. Verify purchase: has this customer ordered this product AND received it?
   * 4. Check for existing review (friendly error before hitting the unique constraint)
   * 5. Save the review + recalculate rating — all in one transaction
   *
   * @param productId - UUID of the product to review (from URL param)
   * @param userId - ID of the authenticated user (from JWT token)
   * @param dto - Rating and optional comment (from request body)
   */
  async createProductReview(
    productId: string,
    userId: string,
    dto: CreateProductReviewDto,
  ): Promise<ProductReview> {
    // ── Step 1: Get the customer's profile ──────────────────────────────────
    //
    // The JWT contains `userId` (User.id), but the review stores `customerId`
    // (CustomerProfile.id). These are different IDs — CustomerProfile is a
    // separate row linked to User via a OneToOne relationship.
    //
    // Why do we store CustomerProfile.id instead of User.id on the review?
    // Because CustomerProfile holds the display name, and other queries
    // (e.g., "show reviewer's first name") JOIN through CustomerProfile.
    const customerProfile = await this.customerProfileRepo.findOne({
      where: { userId },
    });

    if (!customerProfile) {
      throw new ForbiddenException('Customer profile not found');
    }

    // ── Step 2: Verify the product exists ───────────────────────────────────
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // ── Step 3: Purchase verification ───────────────────────────────────────
    //
    // This is the "Verified Purchase" check.
    //
    // We look for an OrderItem where:
    //   - productId matches (customer ordered THIS product)
    //   - The parent order's customerId matches (it's THEIR order, not someone else's)
    //   - The parent order's status is DELIVERED (the order was actually fulfilled)
    //
    // We JOIN order_items → orders to check all three conditions in one query.
    //
    // Why check DELIVERED and not just CONFIRMED?
    // A customer could order a product and then cancel. "I ordered it" isn't the
    // same as "I received it." Only delivered orders earn the right to review.
    //
    // TypeORM QueryBuilder syntax:
    //   .innerJoin('item.order', 'order') — joins the Order entity via the 'order'
    //   relation defined on OrderItem, and aliases it as 'order' for WHERE clauses.
    const purchasedItem = await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .where('item.productId = :productId', { productId })
      .andWhere('order.customerId = :customerId', { customerId: customerProfile.id })
      .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
      .getOne();

    if (!purchasedItem) {
      throw new ForbiddenException(
        'You can only review products from your delivered orders',
      );
    }

    // ── Step 4: Duplicate check ──────────────────────────────────────────────
    //
    // We could rely solely on the DB unique constraint to catch duplicates.
    // But throwing a raw DB error gives a confusing 500 response.
    // This pre-check gives a clean 409 Conflict with a human-readable message.
    //
    // The DB constraint is still the safety net — if somehow two requests race
    // through this check simultaneously, only one will succeed at the DB level.
    const existing = await this.productReviewRepo.findOne({
      where: { customerId: customerProfile.id, productId },
    });

    if (existing) {
      throw new ConflictException(
        'You have already reviewed this product. You can only leave one review per product.',
      );
    }

    // ── Step 5: Save review + update product rating (transactional) ──────────
    //
    // Why a transaction here?
    // We perform two writes:
    //   a) INSERT into product_reviews
    //   b) UPDATE products SET rating = ..., review_count = ...
    //
    // Without a transaction:
    //   - If (a) succeeds but (b) fails → review exists but product rating is stale
    //   - The product shows the wrong average forever (until another review triggers the fix)
    //
    // With a transaction:
    //   - If (b) fails, (a) is rolled back — no orphaned review, consistent state
    const review = await this.dataSource.transaction(async (manager) => {
      // Create and save the review
      const newReview = manager.create(ProductReview, {
        productId,
        customerId: customerProfile.id,
        rating: dto.rating,
        comment: dto.comment,
      });
      const savedReview = await manager.save(newReview);

      // Recalculate product average using SQL AVG
      // ─────────────────────────────────────────
      // getRawOne() returns the raw SQL result row as a plain object.
      // We use it here instead of getOne() because AVG() and COUNT() are
      // aggregate functions that don't map to entity columns.
      //
      // SQL generated:
      //   SELECT AVG(review.rating) AS avg, COUNT(*) AS count
      //   FROM product_reviews review
      //   WHERE review.productId = 'xxx'
      const rawProduct = await manager
        .createQueryBuilder(ProductReview, 'review')
        .select('AVG(review.rating)', 'avg')
        .addSelect('COUNT(*)', 'count')
        .where('review.productId = :productId', { productId })
        .getRawOne<{ avg: string; count: string }>();

      // AVG() and COUNT() return strings from PostgreSQL's pg driver.
      // parseFloat / parseInt convert them to JS numbers.
      // We round to 2 decimal places (e.g., 4.33) to match the Product entity's
      // decimal(3, 2) column definition.
      //
      // getRawOne() can technically return undefined if no rows exist.
      // We use optional chaining (?.) and fall back to '0' to satisfy TypeScript.
      // In practice, there is always at least one row here (the one we just saved).
      const newAvg = parseFloat(rawProduct?.avg ?? '0') || 0;
      const newCount = parseInt(rawProduct?.count ?? '0', 10) || 0;

      await manager.update(Product, productId, {
        rating: Math.round(newAvg * 100) / 100,
        reviewCount: newCount,
      });

      this.logger.log(
        `Product ${productId} rating updated: ${newAvg.toFixed(2)} (${newCount} reviews)`,
      );

      return savedReview;
    });

    return review;
  }

  /**
   * Get paginated reviews for a product.
   *
   * Public endpoint — no auth required.
   * Optionally filter by star rating (e.g., only 5-star reviews).
   *
   * We join the customer profile to show the reviewer's name.
   * We select only firstName + lastName (not the full profile object)
   * for privacy — no email, address, or phone number exposed.
   */
  async getProductReviews(
    productId: string,
    filters: ReviewFilterDto,
  ): Promise<{ reviews: ProductReview[]; total: number; averageRating: number }> {
    // Verify the product exists before querying reviews
    const productExists = await this.productRepo.findOne({
      where: { id: productId },
      select: ['id', 'rating', 'reviewCount'],
    });

    if (!productExists) {
      throw new NotFoundException('Product not found');
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const query = this.productReviewRepo
      .createQueryBuilder('review')
      // LEFT JOIN so reviews from deleted customers (customerId = null) still appear
      .leftJoin('review.customer', 'customer')
      .addSelect(['customer.firstName', 'customer.lastName'])
      .where('review.productId = :productId', { productId })
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Optional: filter to a specific star rating
    if (filters.rating) {
      query.andWhere('review.rating = :rating', { rating: filters.rating });
    }

    const [reviews, total] = await query.getManyAndCount();

    return {
      reviews,
      total,
      // Use the pre-calculated average from the Product entity (faster than re-running AVG)
      averageRating: Number(productExists.rating) || 0,
    };
  }

  // ================================================================
  // SECTION 2: VENDOR REVIEWS
  // ================================================================

  /**
   * Create a vendor review.
   *
   * Flow:
   * 1. Resolve customer profile from userId
   * 2. Verify the vendor exists
   * 3. Verify the specific order: exists + belongs to customer + belongs to vendor + DELIVERED
   * 4. Check for existing review on this order (pre-check before DB unique constraint)
   * 5. Save review + recalculate vendor rating in a transaction
   *
   * @param vendorId - UUID of the vendor to rate (from URL param)
   * @param userId - Authenticated user ID (from JWT)
   * @param dto - Rating, optional comment, and required orderId
   */
  async createVendorReview(
    vendorId: string,
    userId: string,
    dto: CreateVendorReviewDto,
  ): Promise<VendorReview> {
    // ── Step 1: Get the customer's profile ──────────────────────────────────
    const customerProfile = await this.customerProfileRepo.findOne({
      where: { userId },
    });

    if (!customerProfile) {
      throw new ForbiddenException('Customer profile not found');
    }

    // ── Step 2: Verify the vendor exists ────────────────────────────────────
    const vendor = await this.vendorProfileRepo.findOne({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // ── Step 3: Order verification ──────────────────────────────────────────
    //
    // We verify four things with ONE query:
    //   - The order exists (findOne returns null if not)
    //   - orderId matches (URL param + DTO must agree)
    //   - customerId matches (THEIR order, not someone else's)
    //   - vendorId matches (rating THIS vendor, not another from a multi-vendor checkout)
    //   - status = DELIVERED (actually fulfilled, not just placed or cancelled)
    //
    // This one query replaces four separate verification checks,
    // making the code efficient and preventing partial-state bugs.
    const order = await this.orderRepo.findOne({
      where: {
        id: dto.orderId,
        vendorId,
        customerId: customerProfile.id,
        status: OrderStatus.DELIVERED,
      },
    });

    if (!order) {
      throw new ForbiddenException(
        'You can only rate vendors from your own delivered orders. ' +
          'Make sure the order ID belongs to a completed order from this vendor.',
      );
    }

    // ── Step 4: Duplicate check ──────────────────────────────────────────────
    const existing = await this.vendorReviewRepo.findOne({
      where: { customerId: customerProfile.id, orderId: dto.orderId },
    });

    if (existing) {
      throw new ConflictException(
        'You have already rated this order. Each order can only be rated once.',
      );
    }

    // ── Step 5: Save review + update vendor rating (transactional) ──────────
    const review = await this.dataSource.transaction(async (manager) => {
      const newReview = manager.create(VendorReview, {
        vendorId,
        customerId: customerProfile.id,
        orderId: dto.orderId,
        rating: dto.rating,
        comment: dto.comment,
      });
      const savedReview = await manager.save(newReview);

      // Recalculate vendor's average rating using SQL AVG
      const rawVendor = await manager
        .createQueryBuilder(VendorReview, 'review')
        .select('AVG(review.rating)', 'avg')
        .addSelect('COUNT(*)', 'count')
        .where('review.vendorId = :vendorId', { vendorId })
        .getRawOne<{ avg: string; count: string }>();

      const newAvg = parseFloat(rawVendor?.avg ?? '0') || 0;
      const newCount = parseInt(rawVendor?.count ?? '0', 10) || 0;

      // Update the VendorProfile with the new average and count
      await manager.update(VendorProfile, vendorId, {
        rating: Math.round(newAvg * 100) / 100,
        totalReviews: newCount,
      });

      this.logger.log(
        `Vendor ${vendorId} rating updated: ${newAvg.toFixed(2)} (${newCount} reviews)`,
      );

      return savedReview;
    });

    return review;
  }

  /**
   * Get paginated reviews for a vendor.
   *
   * Public endpoint — no auth required.
   * Joins customer name for display. Optionally filter by star rating.
   */
  async getVendorReviews(
    vendorId: string,
    filters: ReviewFilterDto,
  ): Promise<{ reviews: VendorReview[]; total: number; averageRating: number }> {
    const vendor = await this.vendorProfileRepo.findOne({
      where: { id: vendorId },
      select: ['id', 'rating', 'totalReviews'],
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const query = this.vendorReviewRepo
      .createQueryBuilder('review')
      .leftJoin('review.customer', 'customer')
      .addSelect(['customer.firstName', 'customer.lastName'])
      .where('review.vendorId = :vendorId', { vendorId })
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.rating) {
      query.andWhere('review.rating = :rating', { rating: filters.rating });
    }

    const [reviews, total] = await query.getManyAndCount();

    return {
      reviews,
      total,
      averageRating: Number(vendor.rating) || 0,
    };
  }
}
