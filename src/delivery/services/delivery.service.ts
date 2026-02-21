/**
 * Delivery Service
 *
 * Core business logic for the delivery lifecycle:
 * - Assigning orders to riders
 * - Rider accepts/rejects deliveries
 * - Picking up and completing deliveries
 * - Cancelling deliveries
 *
 * KEY LEARNING: Avoiding Circular Dependencies
 * =============================================
 * This service needs to update Order status (e.g., PICKED_UP, DELIVERED).
 * Instead of injecting OrdersService (which might depend on us later),
 * we inject the Order REPOSITORY directly and use pure functions from
 * order-status-machine.ts.
 *
 * Why? NestJS resolves dependencies at startup. If ServiceA depends on
 * ServiceB and ServiceB depends on ServiceA, NestJS can't start.
 * Using repositories instead of services avoids this "chicken-and-egg" problem.
 *
 * Rule of thumb:
 * - Need to READ/WRITE data? → Use the repository
 * - Need business logic validation? → Use pure functions (like canTransition)
 * - Need FULL orchestration? → Then inject the other service (accept the coupling)
 *
 * KEY LEARNING: Database Transactions for Multi-Entity Updates
 * ============================================================
 * When a rider picks up an order, we update BOTH:
 * 1. The Delivery entity (status → PICKED_UP)
 * 2. The Order entity (status → PICKED_UP)
 *
 * These MUST happen atomically. If the delivery updates but the order
 * doesn't, the system is in an inconsistent state. This is exactly what
 * database transactions solve — same pattern used in createOrder().
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Delivery } from '../entities/delivery.entity';
import { Order } from '../../orders/entities/order.entity';
import {
  RiderProfile,
  RiderStatus,
  AvailabilityStatus,
} from '../../users/entities/rider-profile.entity';
import { DeliveryStatus } from '../enums/delivery-status.enum';
import { AssignmentType } from '../enums/assignment-type.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { canTransition } from '../../orders/order-status-machine';
import { StorageFactoryService } from '../../storage/storage-factory.service';
import { RiderLocationService } from './rider-location.service';
import {
  NOTIFICATION_EVENTS,
  DeliveryAssignedEvent,
  DeliveryStatusUpdatedEvent,
} from '../../notifications/events/notification-events';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(RiderProfile)
    private readonly riderRepository: Repository<RiderProfile>,

    /**
     * DataSource for transactions — same pattern as OrdersService.
     * We need transactions when updating multiple entities atomically.
     */
    private readonly dataSource: DataSource,

    private readonly storageFactory: StorageFactoryService,

    private readonly riderLocationService: RiderLocationService,

    /**
     * Same EventEmitter2 used in OrdersService.
     * EventEmitterModule.forRoot() registers it globally — one shared bus
     * for the entire application. Any service can inject it.
     */
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==================== ASSIGNMENT ====================

  /**
   * Assign an order to a rider (manual admin assignment).
   *
   * KEY LEARNING: Precondition Validation Pattern
   * ==============================================
   * Before creating the delivery, we validate ALL preconditions:
   * 1. Order exists and is READY_FOR_PICKUP
   * 2. No active delivery already exists for this order
   * 3. Rider exists, is APPROVED, and is ONLINE
   * 4. Rider doesn't have another active delivery
   *
   * We check ALL conditions before making ANY changes. This prevents
   * partial updates — we never get "rider set to BUSY but delivery
   * creation failed."
   *
   * KEY LEARNING: Optimistic vs Pessimistic Concurrency
   * ====================================================
   * There's a race condition: two admins could assign the same rider
   * simultaneously. For MVP, we handle this optimistically — if two
   * requests race, the second one will fail the "rider already BUSY" check.
   * For production, you'd use pessimistic locking (SELECT ... FOR UPDATE)
   * or a Redis lock.
   */
  async assignOrderToRider(
    orderId: string,
    riderId: string,
    adminUserId: string | null,
    assignmentType: AssignmentType,
  ): Promise<Delivery> {
    // 1. Validate order
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    if (order.status !== OrderStatus.READY_FOR_PICKUP) {
      throw new BadRequestException(
        `Order must be in "ready_for_pickup" status to assign a rider. Current status: "${order.status}"`,
      );
    }

    // 2. Check no active delivery exists for this order
    const existingDelivery = await this.deliveryRepository.findOne({
      where: {
        orderId,
        status: In([
          DeliveryStatus.PENDING_ACCEPTANCE,
          DeliveryStatus.ACCEPTED,
          DeliveryStatus.PICKED_UP,
        ]),
      },
    });

    if (existingDelivery) {
      throw new ConflictException(
        `Order already has an active delivery (ID: ${existingDelivery.id}, status: ${existingDelivery.status})`,
      );
    }

    // 3. Validate rider
    const rider = await this.riderRepository.findOne({
      where: { id: riderId },
    });

    if (!rider) {
      throw new NotFoundException(`Rider "${riderId}" not found`);
    }

    if (rider.status !== RiderStatus.APPROVED) {
      throw new BadRequestException(
        `Rider is not approved. Current status: "${rider.status}"`,
      );
    }

    if (rider.availabilityStatus !== AvailabilityStatus.ONLINE) {
      throw new BadRequestException(
        `Rider is not online. Current availability: "${rider.availabilityStatus}"`,
      );
    }

    // 4. Check rider doesn't have another active delivery
    const riderActiveDelivery = await this.deliveryRepository.findOne({
      where: {
        riderId,
        status: In([
          DeliveryStatus.PENDING_ACCEPTANCE,
          DeliveryStatus.ACCEPTED,
          DeliveryStatus.PICKED_UP,
        ]),
      },
    });

    if (riderActiveDelivery) {
      throw new ConflictException(
        `Rider already has an active delivery (ID: ${riderActiveDelivery.id})`,
      );
    }

    // 5. All preconditions passed — create the delivery
    const delivery = this.deliveryRepository.create({
      orderId,
      riderId,
      assignmentType,
      assignedBy: assignmentType === AssignmentType.MANUAL ? adminUserId ?? undefined : undefined,
      dropoffLatitude: order.deliveryLatitude,
      dropoffLongitude: order.deliveryLongitude,
    });

    // 6. Set rider to BUSY
    rider.availabilityStatus = AvailabilityStatus.BUSY;

    // Save both in a transaction
    const savedDelivery = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(Delivery).save(delivery);
      await manager.getRepository(RiderProfile).save(rider);

      this.logger.log(
        `Order ${orderId} assigned to rider ${riderId} (${assignmentType})`,
      );

      return saved;
    });

    /**
     * Notify the rider about their new assignment.
     * Emitted AFTER the transaction — rider gets the notification only
     * when the delivery record is safely in the database.
     */
    const assignedEvent: DeliveryAssignedEvent = {
      deliveryId: savedDelivery.id,
      orderId,
      orderNumber: order.orderNumber ?? '',
      riderId,
      customerId: order.customerId,
      vendorProfileId: order.vendorId,
      assignmentType:
        assignmentType === AssignmentType.MANUAL ? 'MANUAL' : 'AUTO',
      dropoffLatitude: delivery.dropoffLatitude
        ? Number(delivery.dropoffLatitude)
        : undefined,
      dropoffLongitude: delivery.dropoffLongitude
        ? Number(delivery.dropoffLongitude)
        : undefined,
    };
    this.eventEmitter.emit(
      NOTIFICATION_EVENTS.DELIVERY_ASSIGNED,
      assignedEvent,
    );

    return savedDelivery;
  }

  // ==================== RIDER ACTIONS ====================

  /**
   * Rider accepts a delivery assignment.
   *
   * When accepted, we also set order.riderId as a shortcut reference.
   * The Delivery entity remains the authoritative record.
   */
  async acceptDelivery(
    deliveryId: string,
    riderProfileId: string,
  ): Promise<Delivery> {
    const delivery = await this.findDeliveryForRider(
      deliveryId,
      riderProfileId,
    );

    if (delivery.status !== DeliveryStatus.PENDING_ACCEPTANCE) {
      throw new BadRequestException(
        `Cannot accept a delivery with status "${delivery.status}". Must be "pending_acceptance".`,
      );
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      delivery.status = DeliveryStatus.ACCEPTED;
      delivery.acceptedAt = new Date();

      const result = await manager.save(Delivery, delivery);

      // Set the shortcut riderId on the order
      await manager.update(Order, delivery.orderId, {
        riderId: riderProfileId,
      });

      this.logger.log(
        `Delivery ${deliveryId} accepted by rider ${riderProfileId}`,
      );
      return result;
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.DELIVERY_ACCEPTED, {
      deliveryId,
      orderId: saved.orderId,
      riderId: riderProfileId,
      customerId: '',
      vendorProfileId: '',
      previousStatus: DeliveryStatus.PENDING_ACCEPTANCE,
      newStatus: DeliveryStatus.ACCEPTED,
      timestamp: new Date(),
    } satisfies DeliveryStatusUpdatedEvent);

    return saved;
  }

  /**
   * Rider rejects a delivery assignment.
   *
   * KEY LEARNING: Graceful Rejection
   * =================================
   * When a rider rejects, we:
   * 1. Mark this delivery as REJECTED (historical record)
   * 2. Set rider back to ONLINE (they're free for other deliveries)
   * 3. The order stays READY_FOR_PICKUP — admin can assign another rider
   *
   * We do NOT delete the rejected delivery. It's an audit record:
   * "Rider A was offered this delivery at 2:30 PM and declined."
   * This data helps optimize future assignments.
   */
  async rejectDelivery(
    deliveryId: string,
    riderProfileId: string,
  ): Promise<Delivery> {
    const delivery = await this.findDeliveryForRider(
      deliveryId,
      riderProfileId,
    );

    if (delivery.status !== DeliveryStatus.PENDING_ACCEPTANCE) {
      throw new BadRequestException(
        `Cannot reject a delivery with status "${delivery.status}". Must be "pending_acceptance".`,
      );
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      delivery.status = DeliveryStatus.REJECTED;
      delivery.rejectedAt = new Date();

      const result = await manager.save(Delivery, delivery);

      // Set rider back to ONLINE
      await manager.update(RiderProfile, riderProfileId, {
        availabilityStatus: AvailabilityStatus.ONLINE,
      });

      this.logger.log(
        `Delivery ${deliveryId} rejected by rider ${riderProfileId}`,
      );
      return result;
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.DELIVERY_REJECTED, {
      deliveryId,
      orderId: saved.orderId,
      riderId: riderProfileId,
      customerId: '',
      vendorProfileId: '',
      previousStatus: DeliveryStatus.PENDING_ACCEPTANCE,
      newStatus: DeliveryStatus.REJECTED,
      timestamp: new Date(),
    } satisfies DeliveryStatusUpdatedEvent);

    return saved;
  }

  /**
   * Rider marks food as picked up from vendor.
   *
   * KEY LEARNING: Cross-Entity State Sync
   * ======================================
   * This is where the Delivery lifecycle SYNCS with the Order lifecycle:
   * - Delivery: ACCEPTED → PICKED_UP
   * - Order: READY_FOR_PICKUP → PICKED_UP
   *
   * Both transitions must happen atomically in a transaction.
   * We use the order-status-machine's canTransition() to validate
   * the order transition is legal before making any changes.
   */
  async pickUpDelivery(
    deliveryId: string,
    riderProfileId: string,
  ): Promise<Delivery> {
    const delivery = await this.findDeliveryForRider(
      deliveryId,
      riderProfileId,
    );

    if (delivery.status !== DeliveryStatus.ACCEPTED) {
      throw new BadRequestException(
        `Cannot pick up. Delivery status must be "accepted", got "${delivery.status}".`,
      );
    }

    // Validate the order can transition too
    const order = await this.orderRepository.findOne({
      where: { id: delivery.orderId },
    });

    if (!order || !canTransition(order.status, OrderStatus.PICKED_UP)) {
      throw new BadRequestException(
        `Order cannot transition to "picked_up". Current order status: "${order?.status}"`,
      );
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      // Update delivery
      delivery.status = DeliveryStatus.PICKED_UP;
      delivery.pickedUpAt = new Date();
      const result = await manager.save(Delivery, delivery);

      // Sync order status
      order.status = OrderStatus.PICKED_UP;
      order.pickedUpAt = new Date();
      await manager.save(Order, order);

      this.logger.log(
        `Delivery ${deliveryId}: food picked up by rider ${riderProfileId}`,
      );
      return result;
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.DELIVERY_PICKED_UP, {
      deliveryId,
      orderId: saved.orderId,
      riderId: riderProfileId,
      customerId: order.customerId,
      vendorProfileId: order.vendorId,
      previousStatus: DeliveryStatus.ACCEPTED,
      newStatus: DeliveryStatus.PICKED_UP,
      timestamp: new Date(),
    } satisfies DeliveryStatusUpdatedEvent);

    return saved;
  }

  /**
   * Rider completes the delivery.
   *
   * This is the "happy path" end of the delivery lifecycle.
   * We:
   * 1. Upload proof-of-delivery image (if provided)
   * 2. Mark delivery as DELIVERED
   * 3. Sync order status to DELIVERED
   * 4. Set rider back to ONLINE (ready for new deliveries)
   * 5. Increment rider's totalDeliveries counter
   *
   * KEY LEARNING: File Upload in a Service
   * =======================================
   * We use StorageFactoryService to upload the proof image.
   * The controller handles the multipart parsing (@UseInterceptors),
   * and passes the Multer file object to this service.
   * The service handles WHERE to store it (folder, options).
   * This separation means you can change storage providers
   * without touching any controller code.
   */
  async completeDelivery(
    deliveryId: string,
    riderProfileId: string,
    proofImage?: Express.Multer.File,
    notes?: string,
  ): Promise<Delivery> {
    const delivery = await this.findDeliveryForRider(
      deliveryId,
      riderProfileId,
    );

    if (delivery.status !== DeliveryStatus.PICKED_UP) {
      throw new BadRequestException(
        `Cannot complete. Delivery status must be "picked_up", got "${delivery.status}".`,
      );
    }

    const order = await this.orderRepository.findOne({
      where: { id: delivery.orderId },
    });

    if (!order || !canTransition(order.status, OrderStatus.DELIVERED)) {
      throw new BadRequestException(
        `Order cannot transition to "delivered". Current order status: "${order?.status}"`,
      );
    }

    // Upload proof image if provided
    let proofUrl: string | null = null;
    if (proofImage) {
      try {
        const storageService =
          this.storageFactory.getStorageService('image');
        const result = await storageService.upload(proofImage, {
          folder: 'delivery-proofs',
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maxSizeBytes: 5 * 1024 * 1024, // 5MB
        });
        proofUrl = result.url;
      } catch (error) {
        this.logger.warn(
          `Failed to upload proof image for delivery ${deliveryId}: ${error.message}`,
        );
        // Don't block delivery completion if image upload fails
      }
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      // Update delivery
      delivery.status = DeliveryStatus.DELIVERED;
      delivery.deliveredAt = new Date();
      if (proofUrl) delivery.proofOfDeliveryUrl = proofUrl;
      if (notes) delivery.deliveryNotes = notes;

      const result = await manager.save(Delivery, delivery);

      // Sync order status
      order.status = OrderStatus.DELIVERED;
      order.deliveredAt = new Date();
      await manager.save(Order, order);

      // Set rider back to ONLINE and increment delivery count
      await manager
        .createQueryBuilder()
        .update(RiderProfile)
        .set({
          availabilityStatus: AvailabilityStatus.ONLINE,
          totalDeliveries: () => '"totalDeliveries" + 1',
        })
        .where('id = :id', { id: riderProfileId })
        .execute();

      this.logger.log(
        `Delivery ${deliveryId} completed by rider ${riderProfileId}`,
      );
      return result;
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.DELIVERY_COMPLETED, {
      deliveryId,
      orderId: saved.orderId,
      riderId: riderProfileId,
      customerId: order.customerId,
      vendorProfileId: order.vendorId,
      previousStatus: DeliveryStatus.PICKED_UP,
      newStatus: DeliveryStatus.DELIVERED,
      timestamp: new Date(),
    } satisfies DeliveryStatusUpdatedEvent);

    return saved;
  }

  // ==================== ADMIN: CANCEL DELIVERY ====================

  /**
   * Admin cancels a delivery.
   *
   * Used when something goes wrong (rider emergency, fraud, etc.).
   * The rider goes back to ONLINE and the order can be reassigned.
   */
  async cancelDelivery(
    deliveryId: string,
    adminUserId: string,
    reason: string,
  ): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery "${deliveryId}" not found`);
    }

    // Can only cancel active deliveries
    const cancellableStatuses = [
      DeliveryStatus.PENDING_ACCEPTANCE,
      DeliveryStatus.ACCEPTED,
      DeliveryStatus.PICKED_UP,
    ];

    if (!cancellableStatuses.includes(delivery.status)) {
      throw new BadRequestException(
        `Cannot cancel a delivery with status "${delivery.status}"`,
      );
    }

    const previousStatus = delivery.status;

    const saved = await this.dataSource.transaction(async (manager) => {
      delivery.status = DeliveryStatus.CANCELLED;
      delivery.cancelledAt = new Date();
      delivery.cancellationReason = reason;

      const result = await manager.save(Delivery, delivery);

      // Set rider back to ONLINE
      await manager.update(RiderProfile, delivery.riderId, {
        availabilityStatus: AvailabilityStatus.ONLINE,
      });

      // If order was already PICKED_UP, we can't revert it to READY_FOR_PICKUP
      // (our state machine doesn't allow backward transitions).
      // Admin will need to handle this case manually.

      this.logger.log(
        `Delivery ${deliveryId} cancelled by admin ${adminUserId}. Reason: ${reason}`,
      );
      return result;
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.DELIVERY_CANCELLED, {
      deliveryId,
      orderId: saved.orderId,
      riderId: saved.riderId,
      customerId: '',
      vendorProfileId: '',
      previousStatus,
      newStatus: DeliveryStatus.CANCELLED,
      reason,
      timestamp: new Date(),
    } satisfies DeliveryStatusUpdatedEvent);

    return saved;
  }

  // ==================== AUTO-ASSIGNMENT ====================

  /**
   * Automatically assign the nearest available rider to an order.
   *
   * KEY LEARNING: Assignment Algorithm
   * ===================================
   * This combines TWO systems:
   * 1. Redis GEO (fast geospatial search) — "who is near this location?"
   * 2. PostgreSQL (business rules) — "who is approved, online, and free?"
   *
   * Algorithm:
   * 1. Get the order's delivery coordinates
   * 2. Search for riders within 10km radius using Redis GEOSEARCH
   * 3. The location service already filters by APPROVED + ONLINE status
   * 4. Filter out riders with active deliveries
   * 5. Assign the nearest remaining rider
   *
   * If no rider is found, return null (admin can manually assign later).
   *
   * KEY LEARNING: Graceful Degradation
   * ===================================
   * Auto-assignment is a BEST EFFORT feature. If it fails (no riders nearby,
   * Redis down, etc.), the order isn't stuck — it stays READY_FOR_PICKUP
   * and the admin can manually assign a rider. This is why we return null
   * instead of throwing an error.
   */
  async autoAssignOrder(orderId: string): Promise<Delivery | null> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    if (order.status !== OrderStatus.READY_FOR_PICKUP) {
      throw new BadRequestException(
        `Order must be "ready_for_pickup" for auto-assignment. Current: "${order.status}"`,
      );
    }

    // Use delivery coordinates as the search center
    if (!order.deliveryLatitude || !order.deliveryLongitude) {
      throw new BadRequestException(
        'Order does not have delivery coordinates. Cannot auto-assign.',
      );
    }

    // Find nearest available riders (10km radius, top 5 candidates)
    const nearbyRiders = await this.riderLocationService.findNearestRiders(
      Number(order.deliveryLatitude),
      Number(order.deliveryLongitude),
      10,
      5,
    );

    if (nearbyRiders.length === 0) {
      this.logger.warn(
        `No nearby riders found for order ${orderId}. Manual assignment needed.`,
      );
      return null;
    }

    // Try each rider (nearest first) until one can be assigned
    for (const candidate of nearbyRiders) {
      // Check if this rider already has an active delivery
      const activeDelivery = await this.deliveryRepository.findOne({
        where: {
          riderId: candidate.riderId,
          status: In([
            DeliveryStatus.PENDING_ACCEPTANCE,
            DeliveryStatus.ACCEPTED,
            DeliveryStatus.PICKED_UP,
          ]),
        },
      });

      if (activeDelivery) {
        continue; // Skip busy riders
      }

      // This rider is available — assign them
      try {
        const delivery = await this.assignOrderToRider(
          orderId,
          candidate.riderId,
          null, // No admin for auto-assignment
          AssignmentType.AUTO,
        );

        this.logger.log(
          `Auto-assigned order ${orderId} to rider ${candidate.riderId} (${candidate.distanceKm.toFixed(1)}km away)`,
        );
        return delivery;
      } catch (error) {
        // Race condition: rider might have been assigned between our check and assign
        this.logger.warn(
          `Failed to auto-assign rider ${candidate.riderId}: ${error.message}`,
        );
        continue;
      }
    }

    this.logger.warn(
      `All nearby riders are busy for order ${orderId}. Manual assignment needed.`,
    );
    return null;
  }

  // ==================== QUERIES ====================

  /**
   * Get the active delivery for an order.
   *
   * "Active" means not rejected or cancelled.
   * Returns null if no active delivery exists.
   */
  async findDeliveryByOrder(orderId: string): Promise<Delivery | null> {
    return this.deliveryRepository.findOne({
      where: {
        orderId,
        status: In([
          DeliveryStatus.PENDING_ACCEPTANCE,
          DeliveryStatus.ACCEPTED,
          DeliveryStatus.PICKED_UP,
          DeliveryStatus.DELIVERED,
        ]),
      },
      relations: ['rider', 'order'],
    });
  }

  /**
   * Get a rider's current active delivery.
   *
   * A rider can only have ONE active delivery at a time.
   */
  async findActiveDeliveryForRider(
    riderId: string,
  ): Promise<Delivery | null> {
    return this.deliveryRepository.findOne({
      where: {
        riderId,
        status: In([
          DeliveryStatus.PENDING_ACCEPTANCE,
          DeliveryStatus.ACCEPTED,
          DeliveryStatus.PICKED_UP,
        ]),
      },
      relations: ['order'],
    });
  }

  /**
   * Get full delivery details by ID.
   */
  async getDeliveryDetails(deliveryId: string): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
      relations: ['order', 'rider'],
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery "${deliveryId}" not found`);
    }

    return delivery;
  }

  // ==================== HELPERS ====================

  /**
   * Find a delivery and verify it belongs to the given rider.
   *
   * KEY LEARNING: Ownership Verification
   * =====================================
   * Always verify that the requesting user OWNS the resource.
   * The JWT guard confirms "you are a rider," but we also need to confirm
   * "this is YOUR delivery." Without this check, Rider A could accept
   * Rider B's delivery by guessing the delivery ID.
   *
   * This is called "Broken Object Level Authorization" (BOLA) in OWASP
   * and is the #1 API security vulnerability.
   */
  private async findDeliveryForRider(
    deliveryId: string,
    riderProfileId: string,
  ): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery "${deliveryId}" not found`);
    }

    if (delivery.riderId !== riderProfileId) {
      throw new BadRequestException(
        'This delivery is not assigned to you',
      );
    }

    return delivery;
  }
}
