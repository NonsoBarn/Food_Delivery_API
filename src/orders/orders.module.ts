/**
 * Orders Module
 *
 * NestJS modules are the building blocks of application architecture.
 * Each module encapsulates a related set of features.
 *
 * This module:
 * - Registers Order and OrderItem entities with TypeORM
 * - Imports CartModule (to read/clear the cart during checkout)
 * - Imports ProductsModule (for stock management — though we handle
 *   stock directly via the transaction manager in the service)
 * - Provides the OrdersService and OrdersController
 * - Exports OrdersService for use by other modules (if needed)
 *
 * Module Dependency Chain:
 *   OrdersModule → CartModule → RedisModule
 *                → ProductsModule → CategoriesModule
 *
 * Why import CartModule?
 * The OrdersService calls cartService.validateCart(), getCart(), and clearCart().
 * Importing CartModule makes CartService available for injection.
 *
 * Why import ProductsModule?
 * While we handle stock updates directly via the transaction manager
 * (not through ProductsService), we import it for potential future use
 * and to ensure Product entity is available.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [
    /**
     * TypeOrmModule.forFeature() registers entities for THIS module.
     *
     * This creates Repository<Order> and Repository<OrderItem> providers
     * that can be injected with @InjectRepository(Order).
     *
     * Note: The entities are also auto-discovered by the wildcard pattern
     * in DatabaseModule, but forFeature() is needed to create the
     * repository providers for dependency injection.
     */
    TypeOrmModule.forFeature([Order, OrderItem]),

    /**
     * Import CartModule to access CartService.
     * CartModule exports CartService, so we can inject it in OrdersService.
     */
    CartModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
