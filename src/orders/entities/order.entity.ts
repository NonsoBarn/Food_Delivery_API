/**
 * Order Entity
 *
 * Represents a single order to a SINGLE vendor.
 *
 * Architecture Decision: One Order = One Vendor
 * When a customer's cart has items from multiple vendors (e.g., Pizza Palace
 * and Burger Barn), checkout creates SEPARATE orders — one per vendor.
 * These orders are linked by a shared `orderGroupId` so the customer
 * can see them as "one checkout."
 *
 * Why split by vendor?
 * 1. Each vendor confirms, prepares, and marks ready independently
 * 2. Each order gets its own rider and delivery tracking
 * 3. Cancelling from one vendor doesn't affect the other
 * 4. Status management is simpler (one status per order, not per item)
 * 5. This is the industry standard (Uber Eats, DoorDash, etc.)
 *
 * Denormalization:
 * - Delivery address is COPIED from the customer profile at order time
 * - Prices are FROZEN at order time (from cart)
 * - If the customer moves or prices change later, the order record stays accurate
 *
 * Indexes:
 * - (customerId, createdAt) — Customer's "My Orders" page, sorted by date
 * - (vendorId, status) — Vendor dashboard: "Show me all PENDING orders"
 * - (orderGroupId) — Get all orders from one checkout
 * - (status, createdAt) — Admin: "Show me all PREPARING orders"
 * - (orderNumber) unique — Lookup by human-readable number
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomerProfile } from '../../users/entities/customer-profile.entity';
import { VendorProfile } from '../../users/entities/vendor-profile.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('orders')
@Index(['customerId', 'createdAt'])
@Index(['vendorId', 'status'])
@Index(['orderGroupId'])
@Index(['status', 'createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Human-readable order number
   *
   * Format: "ORD-YYYYMMDD-XXXXXX" (e.g., "ORD-20260214-A1B2C3")
   *
   * Why not just use the UUID?
   * - UUIDs are long and hard to read over the phone
   * - Customers and support staff need short, memorable identifiers
   * - The date prefix helps with quick visual sorting
   * - The random suffix prevents guessing other order numbers
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  orderNumber: string;

  /**
   * Order Group ID
   *
   * When a customer checks out a multi-vendor cart, all resulting orders
   * share the same orderGroupId. This lets the customer see "one checkout"
   * while vendors each manage their own order independently.
   *
   * For single-vendor checkouts, this equals the order's own ID.
   */
  @Column({ type: 'uuid' })
  orderGroupId: string;

  // ==================== RELATIONSHIPS ====================

  /**
   * Customer who placed the order.
   *
   * @ManyToOne because one customer can have MANY orders.
   * onDelete: 'SET NULL' — if a customer account is deleted,
   * the order record survives (for accounting/analytics).
   */
  @ManyToOne(() => CustomerProfile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: CustomerProfile;

  @Column({ type: 'uuid' })
  customerId: string;

  /**
   * Vendor fulfilling this order.
   *
   * Each order has exactly ONE vendor. Multi-vendor carts
   * create multiple orders (see orderGroupId above).
   */
  @ManyToOne(() => VendorProfile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: VendorProfile;

  @Column({ type: 'uuid' })
  vendorId: string;

  /**
   * Line items in this order.
   *
   * cascade: true means when you save an Order with items attached,
   * TypeORM automatically saves the OrderItems too.
   * This is convenient for order creation.
   */
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  // ==================== DELIVERY ADDRESS (SNAPSHOT) ====================
  // These are COPIED from the customer's profile at order time.
  // This is denormalization — intentional duplication for data integrity.

  @Column({ type: 'text' })
  deliveryAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deliveryCity: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deliveryState: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  deliveryPostalCode: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  deliveryLatitude: number;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  deliveryLongitude: number;

  // ==================== PRICING ====================
  // All amounts are in the base currency (no currency field yet).
  // precision: 10, scale: 2 means up to 99,999,999.99

  /** Sum of all item subtotals (before tax and delivery fee) */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  /** Tax amount (0 for now, placeholder for future tax calculation) */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  /** Delivery fee charged to customer */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  /** Final amount: subtotal + tax + deliveryFee */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  // ==================== STATUS & PAYMENT ====================

  /**
   * Current order status.
   *
   * TypeORM's `enum` type creates a PostgreSQL ENUM type in the database.
   * This means the database itself enforces that only valid values can be stored.
   * Double safety: our state machine validates transitions in code,
   * AND the database rejects invalid values.
   */
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH_ON_DELIVERY,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  // ==================== KITCHEN & PREPARATION ====================

  /**
   * Estimated preparation time in minutes.
   * Set by the vendor when they confirm the order.
   * Shown to the customer as "Your food will be ready in ~30 minutes."
   */
  @Column({ type: 'integer', nullable: true })
  estimatedPrepTimeMinutes: number;

  // ==================== TIMESTAMPS ====================
  // Each status transition records WHEN it happened.
  // This creates an audit trail and enables analytics
  // (e.g., average prep time, delivery time).

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  preparingAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readyAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickedUpAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  /** Why the order was cancelled (required on cancellation) */
  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  // ==================== NOTES ====================

  /** Special instructions from the customer (e.g., "Ring doorbell twice") */
  @Column({ type: 'text', nullable: true })
  customerNotes: string;

  // ==================== AUDIT ====================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
