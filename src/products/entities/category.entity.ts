import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

/**
 * Category Entity
 *
 * Represents a hierarchical category system for products.
 * Supports 2-level nesting (e.g., Food > Fast Food > Burgers)
 *
 * Key Design Patterns:
 * 1. Self-referential relationship (category can have parent category)
 * 2. Slug for SEO-friendly URLs
 * 3. Soft deletes via isActive flag
 * 4. Display order for admin control
 */
@Entity('categories')
export class Category {
  /**
   * UUID Primary Key
   * Why UUID? Better for distributed systems, no sequential guessing
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Category Name
   * Examples: "Burgers", "Pizza", "Desserts"
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  /**
   * URL-friendly slug
   * Generated from name: "Fast Food" -> "fast-food"
   * Used in URLs: /categories/fast-food/products
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  /**
   * Category Description (optional)
   * Helps with SEO and user understanding
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Category Image URL (optional)
   * Stored in Cloudinary, shows in category grid
   */
  @Column({ type: 'varchar', nullable: true })
  imageUrl: string;

  /**
   * Display Order
   * Lower numbers appear first in lists
   * Allows admins to control category order
   */
  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  /**
   * Active Status (soft delete)
   * false = hidden from customers (but not deleted from DB)
   * Why not hard delete? Preserve historical data & product relationships
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Parent Category Relationship (Self-Referential)
   *
   * This is the KEY concept for hierarchical categories.
   *
   * @ManyToOne: Many categories can belong to one parent
   * Example: "Burgers" and "Pizza" both belong to "Fast Food"
   *
   * nullable: true = allows root categories (no parent)
   * onDelete: 'SET NULL' = if parent deleted, child becomes root
   */
  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Category;

  /**
   * Foreign Key Column
   * Stores the parent category's UUID
   * null = this is a root/top-level category
   */
  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parentId: string;

  /**
   * Child Categories Relationship
   *
   * @OneToMany: One category can have many children
   * Example: "Fast Food" has children ["Burgers", "Pizza"]
   *
   * This is the inverse side of the parent relationship
   */
  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  /**
   * Products in this category
   * One Category can have many Products
   */
  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  /**
   * Audit Timestamps
   * Automatically managed by TypeORM
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
