/**
 * VendorReview Entity
 *
 * Stores a customer's rating of a vendor after a completed (DELIVERED) order.
 *
 * KEY DESIGN DECISIONS:
 *
 * 1. Unique constraint on (customerId, orderId)
 *    One rating per order. This is different from product reviews which are
 *    unique per (customer, product). Here, a customer CAN rate the same vendor
 *    multiple times — once per order. This makes sense because:
 *    - Each delivery experience is independent (fast delivery one day, slow the next)
 *    - Customers should be able to give feedback per experience, not just "overall"
 *    - orderId ties the rating to a specific, verifiable transaction
 *
 * 2. orderId stored as FK (not plain UUID)
 *    We need to VERIFY the order exists and belongs to this customer + vendor.
 *    Using a FK ensures referential integrity. If an order is deleted,
 *    the rating is preserved (SET NULL on orderId) — the rating still contributes
 *    to the vendor's history.
 *
 * 3. vendorId also stored alongside the FK
 *    Even though we can get vendorId from the order, we store it directly.
 *    This makes queries like "get all reviews for vendor X" faster —
 *    no JOIN through orders needed.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { CustomerProfile } from '../../users/entities/customer-profile.entity';
import { VendorProfile } from '../../users/entities/vendor-profile.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('vendor_reviews')
/**
 * Unique constraint: one rating per order.
 *
 * (customerId, orderId) ensures a customer can't rate the same order twice.
 * Note: customerId is technically redundant (orderId already identifies the order,
 * and the order already has a customerId), but including it in the constraint
 * makes security intent explicit: only THIS customer can rate THEIR order.
 */
@Unique(['customerId', 'orderId'])
@Index(['vendorId', 'createdAt']) // Fast: "get all reviews for vendor X, sorted by date"
@Index(['customerId'])              // Fast: "get all reviews BY customer X"
export class VendorReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ==================== RELATIONSHIPS ====================

  /**
   * The customer who wrote this review.
   *
   * onDelete: SET NULL — if customer deletes account, keep the rating
   * (it still counts towards the vendor's overall score).
   */
  @ManyToOne(() => CustomerProfile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: CustomerProfile;

  @Column({ type: 'uuid', nullable: true })
  customerId: string;

  /**
   * The vendor being rated.
   *
   * onDelete: SET NULL — if a vendor account is removed, the rating row
   * stays (for historical analytics) but the FK becomes null.
   */
  @ManyToOne(() => VendorProfile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: VendorProfile;

  @Column({ type: 'uuid', nullable: true })
  vendorId: string;

  /**
   * The specific order this rating is for.
   *
   * This is the PROOF of purchase. Before saving a review, the service
   * verifies this order:
   *   - exists
   *   - belongs to this customer (order.customerId = customer.id)
   *   - belongs to this vendor (order.vendorId = vendorId)
   *   - was actually delivered (order.status = DELIVERED)
   *
   * onDelete: SET NULL — orders might be archived/deleted over time,
   * but we keep the rating for analytics.
   */
  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid', nullable: true })
  orderId: string;

  // ==================== REVIEW CONTENT ====================

  /**
   * Star rating from 1 to 5.
   *
   * Individual ratings are whole numbers; averages (on VendorProfile) are decimal.
   * Validation is done in the DTO with @Min(1) @Max(5) @IsInt().
   */
  @Column({ type: 'integer' })
  rating: number;

  /**
   * Written feedback (optional).
   *
   * Examples: "Food was cold on arrival", "Great packaging!", "Arrived in 15 mins"
   * This qualitative data helps vendors understand WHY they got a certain score.
   */
  @Column({ type: 'text', nullable: true })
  comment: string;

  // ==================== AUDIT ====================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
