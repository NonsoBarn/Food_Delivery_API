/**
 * Delivery Entity
 *
 * The bridge between an Order and a Rider.
 *
 * KEY LEARNING: Why a Separate Entity Instead of Adding Fields to Order?
 * ======================================================================
 * You COULD add riderId, acceptedAt, proofOfDelivery, etc. directly to
 * the Order entity. But that violates the Single Responsibility Principle:
 *
 * 1. The Order entity already has 25+ fields (customer, vendor, items, pricing,
 *    status, timestamps). Adding 15 more delivery fields makes it unwieldy.
 *
 * 2. A delivery can be REJECTED and reassigned. If rider fields lived on Order,
 *    you'd need to null them out and reassign. With a Delivery entity, the
 *    rejected delivery stays as a historical record and a NEW delivery is created.
 *
 * 3. In the future, you might want delivery analytics (average acceptance time,
 *    rejection rates per rider). A dedicated entity makes those queries trivial.
 *
 * KEY LEARNING: Denormalization for Speed
 * ========================================
 * We copy pickup/dropoff coordinates from the vendor and order at assignment time.
 * This means we don't need to JOIN vendor_profiles and orders every time we
 * query delivery data. It also preserves the exact coordinates at assignment time,
 * even if the vendor later updates their address.
 *
 * Relationships:
 * - ManyToOne → Order (one order has one active delivery, but may have past rejected ones)
 * - ManyToOne → RiderProfile (one rider can have many deliveries over time)
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { RiderProfile } from '../../users/entities/rider-profile.entity';
import { DeliveryStatus } from '../enums/delivery-status.enum';
import { AssignmentType } from '../enums/assignment-type.enum';

@Entity('deliveries')
@Index(['orderId'])
@Index(['riderId', 'status'])
@Index(['status', 'createdAt'])
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ==================== RELATIONSHIPS ====================

  /**
   * The order being delivered.
   *
   * Why ManyToOne and not OneToOne?
   * Because an order can have MULTIPLE delivery records over its lifetime:
   * - Delivery #1: Assigned to Rider A → REJECTED
   * - Delivery #2: Assigned to Rider B → ACCEPTED → DELIVERED
   *
   * Only ONE delivery is ever "active" (not rejected/cancelled) at a time.
   * The others are historical records.
   */
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid' })
  orderId: string;

  /**
   * The rider assigned to this delivery.
   *
   * SET NULL on delete: if a rider account is deleted, we keep the delivery
   * record for historical/audit purposes.
   */
  @ManyToOne(() => RiderProfile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'riderId' })
  rider: RiderProfile;

  @Column({ type: 'uuid' })
  riderId: string;

  // ==================== STATUS & ASSIGNMENT ====================

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING_ACCEPTANCE,
  })
  status: DeliveryStatus;

  /**
   * How this rider was assigned — manually by admin or auto by proximity.
   * Useful for analytics: "Do auto-assigned deliveries perform better?"
   */
  @Column({ type: 'enum', enum: AssignmentType })
  assignmentType: AssignmentType;

  /** The admin user ID who made this assignment (null for auto-assignments) */
  @Column({ type: 'uuid', nullable: true })
  assignedBy: string;

  // ==================== LOCATION SNAPSHOTS ====================
  // Copied at assignment time for quick access and historical accuracy.

  /** Vendor's latitude at assignment time (pickup point) */
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  pickupLatitude: number;

  /** Vendor's longitude at assignment time (pickup point) */
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  pickupLongitude: number;

  /** Customer's latitude from the order (dropoff point) */
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  dropoffLatitude: number;

  /** Customer's longitude from the order (dropoff point) */
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  dropoffLongitude: number;

  // ==================== ESTIMATES ====================

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  estimatedDistanceKm: number;

  @Column({ type: 'integer', nullable: true })
  estimatedDurationMinutes: number;

  // ==================== PROOF OF DELIVERY ====================

  /**
   * URL of the proof-of-delivery photo.
   *
   * The rider takes a photo when delivering (e.g., food at the door).
   * This protects both the rider and customer in case of disputes.
   * Uploaded via the same StorageFactory used for product images.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  proofOfDeliveryUrl: string;

  /** Optional notes from the rider (e.g., "Left with security guard") */
  @Column({ type: 'text', nullable: true })
  deliveryNotes: string;

  // ==================== TIMESTAMPS ====================
  // Each status transition records WHEN it happened.
  // Same pattern as Order entity — enables delivery time analytics.

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickedUpAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  // ==================== AUDIT ====================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
