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
import { Category } from './category.entity';
import { VendorProfile } from '../../users/entities/vendor-profile.entity';
import { ProductImage } from './product-image.entity';
import { ProductStatus } from '../enums/product-status.enum';

@Entity('products')
@Index(['vendorId', 'status']) // Optimize: Get vendor's active products
@Index(['categoryId', 'status']) // Optimize: Get category's active products
@Index(['status', 'createdAt']) // Optimize: Latest products query
export class Product {
  /**
   * UUID Primary Key
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 250 })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  /**
   * Stock Quantity
   *
   * Special values:
   * - 0 = Out of stock (should auto-change status)
   * - -1 = Unlimited/Don't track (restaurants often don't track)
   * - > 0 = Specific quantity available
   *
   * Examples:
   * - Packaged items: Track precisely (20 bottles of coke)
   * - Made-to-order: Often unlimited (-1)
   * - Limited items: Track closely (5 special burgers left)
   *
   * Business logic:
   * - Decrement on order placement
   * - Increment on order cancellation
   * - Alert vendor when low (e.g., < 10)
   * - Auto-change status to OUT_OF_STOCK when 0
   */
  @Column({ type: 'integer', default: 0 })
  stock: number;

  /**
   * Low Stock Threshold
   *
   * When stock falls below this, trigger alerts:
   * - Email to vendor
   * - Dashboard notification
   * - Optional: Auto-reorder
   *
   * Example:
   * stock: 8, lowStockThreshold: 10
   * → Vendor gets "Low Stock Alert" notification
   *
   * Why nullable?
   * - Unlimited stock items (-1) don't need threshold
   * - Made-to-order items don't need alerts
   */
  @Column({ type: 'integer', nullable: true, name: 'low_stock_threshold' })
  lowStockThreshold: number;

  /**
   * SKU (Stock Keeping Unit)
   *
   * Vendor's internal product code.
   *
   * Examples:
   * - "BURG-001"
   * - "PIZZA-MARG-L"
   * - "DRINK-COKE-330"
   *
   * Why optional?
   * - Small vendors might not use SKUs
   * - Can be generated automatically if needed
   *
   * Why useful?
   * - Inventory management
   * - POS system integration
   * - Barcode scanning
   * - Cross-platform product matching
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sku: string;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status: ProductStatus;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'uuid', nullable: true, name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => VendorProfile, (vendor) => vendor.products, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'vendor_id' })
  vendor: VendorProfile;

  @Column({ type: 'uuid', name: 'vendor_id' })
  vendorId: string;

  /**
   * Product Images Relationship (One-to-Many)
   *
   * One Product has many ProductImages.
   *
   * This is the inverse side of the ProductImage.product relationship.
   *
   * Cascade: true
   * When we save Product with images → images auto-saved
   *
   * Eager loading considerations:
   * - Don't load images in list views (performance)
   * - Load images in detail view
   * - Load only primary image in cart
   */
  @OneToMany(() => ProductImage, (image) => image.product, {
    cascade: true,
  })
  images: ProductImage[];

  /**
   * View Count (Analytics)
   *
   * Track how many times product page is viewed.
   *
   * Use cases:
   * - Popular products ranking
   * - Vendor analytics
   * - "Trending" products
   * - A/B testing
   *
   * Implementation:
   * - Increment on product detail page view
   * - Use Redis for performance (batch update to DB)
   * - Can reset monthly for "trending this month"
   */
  @Column({ type: 'integer', default: 0, name: 'view_count' })
  viewCount: number;

  @Column({ type: 'integer', default: 0, name: 'order_count' })
  orderCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating: number;

  @Column({ type: 'integer', default: 0, name: 'review_count' })
  reviewCount: number;

  /**
   * Audit Timestamps
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
