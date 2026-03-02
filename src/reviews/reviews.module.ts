/**
 * ReviewsModule
 *
 * Encapsulates the reviews feature: product reviews (11.1) and vendor ratings (11.2).
 *
 * KEY LEARNING: TypeOrmModule.forFeature() — what it does
 * =========================================================
 * TypeOrmModule.forFeature([Entity1, Entity2, ...]) does two things:
 *
 * 1. Registers the entities with TypeORM so they're included in schema sync.
 *    (If synchronize: true in database config, TypeORM creates/alters the tables.)
 *
 * 2. Creates Repository<Entity> providers that can be @InjectRepository()'d
 *    into services within this module.
 *
 * Why list all these entities here (not just ProductReview and VendorReview)?
 * Because ReviewsService needs to query Product, VendorProfile, CustomerProfile,
 * Order, and OrderItem — not just the review entities. We need their repositories.
 *
 * Alternative: We could import OrdersModule and ProductsModule (if they export
 * their services/repos). But importing the modules adds coupling between modules.
 * For this learning project, direct forFeature() registration is simpler and
 * keeps the Reviews module self-contained.
 *
 * In a larger codebase, you'd decide:
 *   - Import OrdersModule + export OrdersService if ReviewsService needs
 *     complex order logic (not just raw DB queries)
 *   - Use forFeature() directly if you just need basic repository queries
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ProductReview } from './entities/product-review.entity';
import { VendorReview } from './entities/vendor-review.entity';
import { Product } from '../products/entities/product.entity';
import { VendorProfile } from '../users/entities/vendor-profile.entity';
import { CustomerProfile } from '../users/entities/customer-profile.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // The two new review entities (tables will be created by TypeORM sync)
      ProductReview,
      VendorReview,

      // Existing entities that ReviewsService queries
      Product,         // To verify product exists + update rating/reviewCount
      VendorProfile,   // To verify vendor exists + update rating/totalReviews
      CustomerProfile, // To look up customer's profile from userId (JWT)
      Order,           // To verify vendor order is DELIVERED
      OrderItem,       // To verify product purchase (join to order for status check)
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],

  /**
   * exports: [ReviewsService]
   *
   * Not currently needed — no other module needs ReviewsService.
   * But if you later build an AdminModule that shows all reviews,
   * you'd add exports here so AdminModule can inject ReviewsService.
   *
   * For now, omitting exports keeps the module boundary clean.
   */
})
export class ReviewsModule {}
