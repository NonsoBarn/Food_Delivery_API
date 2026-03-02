/**
 * ProductReview Entity
 *
 * Stores a customer's review of a product they have purchased.
 *
 * KEY DESIGN DECISIONS:
 *
 * 1. FK with onDelete: SET NULL (not a plain UUID like OrderItem)
 *    Reviews reference the CURRENT product, not a historical snapshot.
 *    If a product is deleted, we keep the review row in the DB (for analytics)
 *    but null out the productId. This is different from OrderItem which stores
 *    a plain UUID because orders need to remain immutable historical records.
 *
 * 2. Unique constraint on (customerId, productId)
 *    One review per customer per product. A customer who orders a product
 *    multiple times should update their existing review, not create duplicates.
 *    This is enforced both in code (pre-check) and at the database level
 *    (the DB will throw a unique violation if code check is bypassed).
 *
 * 3. Rating as integer (1–5), not decimal
 *    Customers pick 1, 2, 3, 4, or 5 stars — always whole numbers.
 *    The AVERAGE rating (stored on Product.rating) is decimal (e.g., 4.37),
 *    but individual review ratings are always whole numbers.
 *    Using `integer` in the DB ensures the constraint is enforced at storage level.
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
import { Product } from '../../products/entities/product.entity';

@Entity('product_reviews')
/**
 * @Unique(['customerId', 'productId'])
 *
 * This creates a MULTI-COLUMN UNIQUE CONSTRAINT in PostgreSQL:
 *   UNIQUE (customer_id, product_id)
 *
 * It means: the COMBINATION of customerId + productId must be unique.
 * A customer CAN review different products, and different customers CAN
 * review the same product — but a customer CANNOT review the same product twice.
 *
 * The constraint lives in the DB, so even if you bypass the service layer
 * (direct DB access, migration scripts), duplicates can't be inserted.
 */
@Unique(['customerId', 'productId'])
@Index(['productId', 'createdAt']) // Fast: "get all reviews for product X, sorted by date"
@Index(['customerId'])              // Fast: "get all reviews BY customer X"
export class ProductReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ==================== RELATIONSHIPS ====================

  /**
   * The customer who wrote this review.
   *
   * onDelete: SET NULL — if the customer deletes their account,
   * the review stays in the DB (the rating still contributes to the product's
   * average), but the customerId becomes null (no personal data retained).
   */
  @ManyToOne(() => CustomerProfile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: CustomerProfile;

  @Column({ type: 'uuid', nullable: true })
  customerId: string;

  /**
   * The product being reviewed.
   *
   * onDelete: SET NULL — if a product is deleted (hard delete), the review
   * remains in the DB but productId is nulled out.
   *
   * In practice, products are usually soft-deleted (status: INACTIVE),
   * so this null case should be rare. But we protect against it.
   */
  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'uuid', nullable: true })
  productId: string;

  // ==================== REVIEW CONTENT ====================

  /**
   * Star rating from 1 to 5.
   *
   * Why integer, not decimal?
   * The INDIVIDUAL rating a customer gives is always a whole number (1–5 stars).
   * The AVERAGE rating calculated across all reviews is decimal (e.g., 4.37) —
   * that lives on Product.rating, not here.
   *
   * Database constraint: `check: 'rating >= 1 AND rating <= 5'` is enforced
   * by class-validator in the DTO, but the DB check is the last line of defence.
   */
  @Column({ type: 'integer' })
  rating: number;

  /**
   * Written review text (optional).
   *
   * Customers can leave a star rating without writing a comment.
   * Example: 5 stars with no comment is perfectly valid.
   * The text gives qualitative context beyond the number.
   */
  @Column({ type: 'text', nullable: true })
  comment: string;

  // ==================== AUDIT ====================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
