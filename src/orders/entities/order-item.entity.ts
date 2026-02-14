/**
 * Order Item Entity
 *
 * Represents one line item in an order (e.g., "2x Classic Beef Burger @ $8.99").
 *
 * Key Concept: DENORMALIZATION (Data Snapshots)
 * =============================================
 * Notice that we store productName, productSlug, productImageUrl, and unitPrice
 * directly on the order item — NOT just a reference to the product.
 *
 * Why? Because an order is a HISTORICAL RECORD. Consider these scenarios:
 *
 * 1. Vendor renames "Cheese Pizza" to "Mozzarella Pizza" next month
 *    → Your order should still say "Cheese Pizza" (that's what you ordered)
 *
 * 2. Vendor raises the price from $10 to $12
 *    → Your order should still show $10 (that's what you paid)
 *
 * 3. Vendor deletes the product entirely
 *    → Your order history shouldn't break or show "Product not found"
 *
 * The productId is kept for analytics (e.g., "how many times was this product ordered")
 * but it's NOT a foreign key — if the product is deleted, the order item survives.
 *
 * This is the same principle the Cart uses (freezing price at add-to-cart time),
 * but orders are permanent records while the cart is temporary.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ==================== ORDER RELATIONSHIP ====================

  /**
   * The order this item belongs to.
   *
   * @ManyToOne: Many items belong to one order
   * onDelete: 'CASCADE': If the order is deleted, delete its items too
   *
   * This is the ONLY real foreign key relationship on this entity.
   * The product reference below is intentionally NOT a FK.
   */
  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid' })
  orderId: string;

  // ==================== PRODUCT REFERENCE ====================

  /**
   * Reference to the original product.
   *
   * NOT a foreign key constraint! Just a UUID stored as a plain column.
   * This means:
   * - If the product is deleted, this order item is NOT affected
   * - We can still use this ID for analytics or linking back to the product
   * - TypeORM won't try to load or validate this relationship
   *
   * Why not use @ManyToOne with Product?
   * Because that creates a FK constraint, and deleting a product would
   * either fail (RESTRICT) or cascade-delete order history (CASCADE).
   * Neither is acceptable for a food delivery platform.
   */
  @Column({ type: 'uuid' })
  productId: string;

  // ==================== DENORMALIZED PRODUCT DATA ====================
  // These fields are SNAPSHOTS from the moment the order was placed.
  // They never change, even if the product is updated or deleted.

  @Column({ type: 'varchar', length: 200 })
  productName: string;

  @Column({ type: 'varchar', length: 250 })
  productSlug: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  productImageUrl: string;

  // ==================== PRICING ====================

  /** How many of this product the customer ordered */
  @Column({ type: 'integer' })
  quantity: number;

  /**
   * Price per unit at the time of order.
   *
   * This comes from the cart (which froze the price when the item was added).
   * Even if the vendor changes the price tomorrow, this stays the same.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  /**
   * Total for this line item: quantity * unitPrice
   *
   * Why store this if we can calculate it?
   * - Avoids floating-point rounding issues in queries
   * - Makes SUM queries faster (no multiplication needed)
   * - Standard practice in e-commerce databases
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  // ==================== AUDIT ====================

  @CreateDateColumn()
  createdAt: Date;
}
