import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsEnum,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '../enums/product-status.enum';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Classic Beef Burger',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  @MinLength(3, { message: 'Product name must be at least 3 characters' })
  @MaxLength(100, { message: 'Product name must not exceed 100 characters' })
  name: string;

  @ApiProperty({
    description: 'Detailed product description',
    example: 'Juicy beef patty with fresh vegetables and special sauce',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty({ message: 'Product description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  description: string;

  @ApiProperty({
    description: 'Product price in base currency',
    example: 8.99,
    minimum: 0.01,
    maximum: 99999999.99,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must be a number with maximum 2 decimal places' },
  )
  @Min(0.01, { message: 'Price must be at least 0.01' })
  @Max(99999999.99, { message: 'Price is too high' })
  price: number;

  /**
   * Category ID
   *
   * Products must belong to a category for organization.
   *
   * Validation:
   * - Must be valid UUID
   * - Category must exist in database (checked in service)
   * - Category must be active (checked in service)
   *
   * Why required?
   * - Helps customers find products
   * - Enables filtering by category
   * - Better for SEO
   * - Analytics per category
   */
  @ApiProperty({
    description: 'Category ID the product belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Category ID is required' })
  categoryId: string;

  /**
   * SKU (Stock Keeping Unit) - Optional
   *
   * Vendor's internal product identifier.
   *
   * Use cases:
   * - Inventory management
   * - POS system integration
   * - Barcode/QR code scanning
   * - Order fulfillment tracking
   *
   * Format examples:
   * - "BURG-001"
   * - "PIZZA-MARG-L"
   * - "DRK-COKE-330"
   * - "12345678901" (barcode)
   *
   * Why optional?
   * - Small vendors might not use SKUs
   * - Can be auto-generated if needed
   * - Not critical for basic operations
   */
  @ApiPropertyOptional({
    description: 'Stock Keeping Unit (vendor internal code)',
    example: 'BURG-001',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'SKU must not exceed 100 characters' })
  sku?: string;

  @ApiPropertyOptional({
    description: 'Stock quantity (0=out of stock, -1=unlimited, >0=quantity)',
    example: 50,
    default: 0,
  })
  @Type(() => Number)
  @IsInt({ message: 'Stock must be an integer' })
  @Min(-1, { message: 'Stock must be -1 (unlimited) or greater' })
  @IsOptional()
  stock?: number;

  /**
   * Low Stock Threshold - Optional
   *
   * Alert vendor when stock falls below this number.
   *
   * Examples:
   * - Fast-moving items: 20 (restock at 20)
   * - Slow-moving items: 5 (restock at 5)
   * - Made-to-order: null (no threshold needed)
   *
   * Business logic:
   * - When stock < threshold → Send alert email
   * - Dashboard shows "Low Stock" badge
   * - Optional: Auto-generate purchase order
   *
   * Why optional?
   * - Unlimited stock (-1) doesn't need threshold
   * - Made-to-order doesn't need alerts
   * - Vendor might not want alerts
   */
  @ApiPropertyOptional({
    description: 'Alert vendor when stock falls below this number',
    example: 10,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'Low stock threshold must be an integer' })
  @Min(1, { message: 'Low stock threshold must be at least 1' })
  @IsOptional()
  lowStockThreshold?: number;

  @ApiPropertyOptional({
    description: 'Product status',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  @IsEnum(ProductStatus, { message: 'Invalid product status' })
  @IsOptional()
  status?: ProductStatus;
}
