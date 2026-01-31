import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Upload Product Image DTO
 *
 * Used when uploading images to a product.
 * The actual file is handled by Multer middleware.
 * This DTO contains the metadata for the image.
 *
 * Flow:
 * 1. Frontend sends multipart/form-data with file
 * 2. Multer intercepts and handles file
 * 3. This DTO handles additional metadata
 * 4. Service uploads to Cloudinary
 * 5. ProductImage entity created with URL
 *
 * Example request:
 * POST /products/:id/images
 * Content-Type: multipart/form-data
 *
 * Form fields:
 * - file: <binary data>
 * - altText: "Classic beef burger with cheese"
 * - isPrimary: true
 * - displayOrder: 1
 */
export class UploadProductImageDto {
  /**
   * Alt Text (for accessibility)
   *
   * Describes the image content for:
   * - Screen readers (visually impaired users)
   * - SEO (search engines index this)
   * - Image loading failures (shows this text)
   *
   * Good examples:
   * ✅ "Classic beef burger with lettuce, tomato and cheese"
   * ✅ "Margherita pizza with fresh basil leaves"
   * ✅ "Fried chicken pieces on a white plate"
   *
   * Bad examples:
   * ❌ "image.jpg"
   * ❌ "burger"
   * ❌ "photo"
   *
   * Why optional?
   * - Can be auto-generated from product name if not provided
   * - Better to have some alt text than none
   * - We can prompt vendor to improve it later
   */
  @ApiPropertyOptional({
    description: 'Alternative text for accessibility and SEO',
    example: 'Classic beef burger with fresh vegetables',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Alt text must not exceed 255 characters' })
  altText?: string;

  /**
   * Primary Image Flag
   *
   * Designates this as the main product image.
   *
   * Business Rules (enforced in service):
   * - Only ONE image per product can be primary
   * - If setting new primary → old primary becomes false
   * - First image uploaded defaults to primary
   * - Cannot remove primary without setting another
   *
   * Use cases:
   * - Product listing thumbnails
   * - Search results
   * - Shopping cart items
   * - Order confirmations
   *
   * Default: false (unless it's the first image)
   */
  @ApiPropertyOptional({
    description: 'Set as primary/featured image',
    default: false,
  })
  @Type(() => Boolean)
  @IsBoolean({ message: 'isPrimary must be a boolean' })
  @IsOptional()
  isPrimary?: boolean;

  /**
   * Display Order
   *
   * Controls sequence in product gallery.
   * Lower numbers appear first.
   *
   * Examples:
   * - 1: Main product shot
   * - 2: Side angle
   * - 3: Close-up details
   * - 4: Packaging/presentation
   *
   * Default: Auto-incremented based on existing images
   * - If first image: 1
   * - If second image: 2
   * - If third image: 3, etc.
   *
   * Vendor can reorder later if needed
   */
  @ApiPropertyOptional({
    description: 'Display order in gallery (lower numbers first)',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'Display order must be an integer' })
  @Min(1, { message: 'Display order must be at least 1' })
  @IsOptional()
  displayOrder?: number;
}
