/**
 * AdminModule
 *
 * Encapsulates all admin dashboard functionality (Phase 12.1).
 *
 * KEY LEARNING: TypeOrmModule.forFeature() — per-module entity registration
 * ==========================================================================
 * TypeORM repositories need to be explicitly "unlocked" in each module that
 * wants to use them. This is done via TypeOrmModule.forFeature([...entities]).
 *
 * Why not just declare repos globally?
 * - It forces you to be explicit about which modules access which data
 * - This makes the module's dependencies visible at a glance
 * - It prevents accidental access to sensitive data from unrelated modules
 *
 * Think of it like: TypeORM's global connection is a "warehouse".
 * forFeature() gives THIS module a "key" to the specific entity tables it needs.
 *
 * Note: The same entity CAN be registered in multiple modules — TypeORM's
 * DI container handles this gracefully. Order repos in OrdersModule AND here
 * are the same underlying TypeORM mechanism, just injected in different contexts.
 *
 * KEY LEARNING: Importing modules for their exported services
 * ============================================================
 * AdminModule needs CategoriesService for category management operations.
 * CategoriesService lives in CategoriesModule.
 *
 * To use a service from another module:
 *   1. The providing module MUST export the service (CategoriesModule does: `exports: [CategoriesService]`)
 *   2. The consuming module MUST import the providing module (AdminModule imports CategoriesModule)
 *
 * After this, CategoriesService becomes available for injection inside AdminModule's
 * providers (AdminService). This is the standard NestJS cross-module dependency pattern.
 *
 * You do NOT need to forFeature([Category]) in AdminModule because:
 * - CategoriesService already has the Category repo injection
 * - We're reusing the service, not the repository directly
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

// Entities this module queries directly
import { User } from '../users/entities/user.entity';
import { VendorProfile } from '../users/entities/vendor-profile.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';

// Import CategoriesModule to get access to CategoriesService
import { CategoriesModule } from '../products/categories.module';

@Module({
  imports: [
    // Register the repositories that AdminService will inject
    TypeOrmModule.forFeature([
      User,
      VendorProfile,
      Order,
      Product,
    ]),

    // Import CategoriesModule to make CategoriesService injectable in AdminService
    CategoriesModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
