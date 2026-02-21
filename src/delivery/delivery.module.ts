/**
 * Delivery Module
 *
 * Handles the complete rider & delivery lifecycle:
 * - Rider management (approve, reject, suspend, availability)
 * - Delivery assignment (manual + auto)
 * - Delivery tracking (accept, pickup, complete)
 * - Real-time location tracking (Redis GEO)
 *
 * KEY LEARNING: Module Dependency Design
 * =======================================
 * Notice what this module imports and what it DOESN'T:
 *
 * IMPORTS:
 * - TypeOrmModule.forFeature([...]) — registers entity repositories for THIS module
 * - StorageModule — for proof-of-delivery image uploads
 *
 * DOES NOT IMPORT:
 * - RedisModule — because it's @Global(), so REDIS_CLIENT is available everywhere
 * - OrdersModule — we use the Order REPOSITORY directly, not OrdersService
 *   This avoids circular dependencies (OrdersModule might import DeliveryModule later)
 *
 * EXPORTS:
 * - DeliveryService, RiderLocationService — so other modules can use them
 *   Example: OrdersModule might later auto-assign riders when status changes
 *
 * KEY LEARNING: forFeature() vs forRoot()
 * ========================================
 * - forRoot() — called ONCE in the app (in DatabaseModule) to configure the connection
 * - forFeature() — called in EACH module to register which entities that module uses
 *
 * TypeORM creates a Repository<Entity> for each entity in forFeature().
 * NestJS's DI container then makes it injectable via @InjectRepository(Entity).
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from './entities/delivery.entity';
import { Order } from '../orders/entities/order.entity';
import { RiderProfile } from '../users/entities/rider-profile.entity';
import { StorageModule } from '../storage/storage.module';
import { DeliveryController } from './controllers/delivery.controller';
import { RiderManagementController } from './controllers/rider-management.controller';
import { DeliveryService } from './services/delivery.service';
import { RiderManagementService } from './services/rider-management.service';
import { RiderLocationService } from './services/rider-location.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Delivery, Order, RiderProfile]),
    StorageModule,
  ],
  controllers: [DeliveryController, RiderManagementController],
  providers: [DeliveryService, RiderManagementService, RiderLocationService],
  exports: [DeliveryService, RiderLocationService],
})
export class DeliveryModule {}
