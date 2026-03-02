/**
 * VendorsModule
 *
 * Encapsulates the vendor analytics dashboard (Phase 12.2).
 *
 * KEY LEARNING: Why a dedicated VendorsModule?
 * ==============================================
 * VendorProfile lives in UsersModule. We COULD add vendor dashboard
 * routes to UsersModule instead. But that would mix concerns:
 *   UsersModule: user authentication + profile management
 *   Vendor dashboard: business analytics (revenue, order stats, product performance)
 *
 * These are different responsibilities. Single Responsibility Principle (SRP)
 * says a module should have ONE reason to change.
 * - UsersModule changes when auth logic changes
 * - VendorsModule changes when business metrics change
 *
 * Separating them keeps each module focused and smaller.
 * This is also the "screaming architecture" principle: your folder structure
 * should scream what the system does. `src/vendors/` instantly communicates
 * "this is where vendor-specific business logic lives."
 *
 * KEY LEARNING: OrderItem in forFeature() — why it's here
 * ========================================================
 * VendorDashboardService needs the OrderItem repository to compute
 * revenue per product (JOIN order_items for SUM of subtotals).
 *
 * OrderItem is declared in OrdersModule's TypeOrmModule.forFeature().
 * To use its repository here, we also declare it in VendorsModule.
 * TypeORM allows the same entity to be registered in multiple modules —
 * the underlying connection/metadata is shared, only the DI registration differs.
 *
 * This is not duplication — it's "declaring your dependencies explicitly."
 * Just like npm packages are listed in package.json for each project that
 * uses them, even if they're installed once globally.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorDashboardService } from './vendor-dashboard.service';
import { VendorDashboardController } from './vendor-dashboard.controller';

// Entities this module queries directly
import { VendorProfile } from '../users/entities/vendor-profile.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [
    // Register all entities that VendorDashboardService injects as repositories
    TypeOrmModule.forFeature([
      VendorProfile,
      Order,
      OrderItem,
      Product,
    ]),
  ],
  providers: [VendorDashboardService],
  controllers: [VendorDashboardController],
})
export class VendorsModule {}
