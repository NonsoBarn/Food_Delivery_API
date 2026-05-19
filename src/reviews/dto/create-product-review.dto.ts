/**
 * CreateProductReviewDto
 *
 * Validates the request body when a customer submits a product review.
 *
 * Notice what is NOT in this DTO:
 * - productId: comes from the URL param (:productId), not the body
 * - customerId: comes from the JWT token (@CurrentUser), not the body
 *   This prevents customers from submitting reviews on behalf of others.
 *
 * KEY LEARNING: Where data comes from matters for security
 * ==========================================================
 * - URL params (@Param): resource identity (which product/vendor)
 * - Request body (@Body): customer-provided content (rating, comment)
 * - JWT token (@CurrentUser): authenticated user's identity (WHO is submitting)
 *
 * Never trust the body for identity — a malicious user could put any customerId
 * in the body to impersonate someone else. The JWT token is signed by the server
 * and cannot be tampered with.
 */
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductReviewDto {
  /**
   * Star rating: 1 (terrible) to 5 (excellent).
   *
   * @IsInt() — rejects decimals like 4.5 (individual ratings must be whole numbers)
   * @Min(1) / @Max(5) — rejects out-of-range values (0 or 6 are meaningless)
   * @Type(() => Number) — transforms string "5" (from JSON sometimes) to number 5
   *
   * Why not allow half-stars (4.5)?
   * Half-star ratings add complexity with little benefit for food delivery.
   * Most platforms (Google, Uber Eats) use integer stars.
   * The precision in the AVERAGE (4.37 stars) comes from aggregating many
   * integer ratings, not from individual ratings being fractional.
   */
  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Star rating (1–5)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Really delicious, would order again!', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;
}
