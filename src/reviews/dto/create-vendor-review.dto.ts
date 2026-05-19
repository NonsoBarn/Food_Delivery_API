/**
 * CreateVendorReviewDto
 *
 * Validates the request body when a customer rates a vendor.
 *
 * KEY DIFFERENCE from CreateProductReviewDto:
 * This DTO includes `orderId`, which serves a dual purpose:
 *
 * 1. PROOF OF PURCHASE — the service uses orderId to verify the customer
 *    actually ordered from this vendor and the order was DELIVERED.
 *    Without it, any customer could rate any vendor.
 *
 * 2. UNIQUE CONSTRAINT anchor — the DB unique constraint is on
 *    (customerId, orderId), not (customerId, vendorId).
 *    This means a customer CAN rate the same vendor multiple times —
 *    once per order. Each delivery is a separate experience worth rating.
 *
 * Example: Customer orders from "Pizza Palace" on Monday and again on Friday.
 *   → They provide orderId_A when rating the Monday order
 *   → They provide orderId_B when rating the Friday order
 *   → Both ratings are allowed; they contribute to Pizza Palace's average
 *   → But they CANNOT rate orderId_A twice (unique constraint catches it)
 */
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorReviewDto {
  /**
   * Star rating: 1 to 5.
   * Same validation as product reviews — whole numbers only.
   */
  @ApiProperty({ example: 4, minimum: 1, maximum: 5, description: 'Star rating (1–5)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Food arrived hot and on time!', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Order ID this review is for (proof of purchase)' })
  @IsUUID('4')
  @IsNotEmpty()
  orderId: string;
}
