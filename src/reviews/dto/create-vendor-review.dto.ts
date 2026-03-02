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

export class CreateVendorReviewDto {
  /**
   * Star rating: 1 to 5.
   * Same validation as product reviews — whole numbers only.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  /**
   * Written feedback (optional).
   *
   * For vendor ratings, customers often comment on:
   * - Delivery speed ("Arrived in under 20 minutes!")
   * - Packaging quality ("Food was still hot")
   * - Order accuracy ("They forgot my drink")
   * - Customer service ("Vendor was responsive to my notes")
   */
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;

  /**
   * The order ID this rating is for.
   *
   * This is REQUIRED (not optional) because:
   * 1. We need it to verify the purchase happened
   * 2. It's the unique key for "one rating per order" constraint
   *
   * The service will verify:
   *   - This order exists
   *   - This order belongs to the requesting customer
   *   - This order belongs to the vendor being rated
   *   - This order has status = DELIVERED
   *
   * @IsUUID('4') — validates UUID v4 format (rejects random strings that
   * could never match a real order, short-circuits DB lookup for invalid inputs)
   */
  @IsUUID('4')
  @IsNotEmpty()
  orderId: string;
}
