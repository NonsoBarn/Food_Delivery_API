/**
 * ReviewFilterDto
 *
 * Query parameters for paginating and filtering reviews.
 * Used by both GET /reviews/products/:id and GET /reviews/vendors/:id.
 *
 * KEY LEARNING: Query params vs Body
 * ===================================
 * GET requests should not have a body (it's allowed by HTTP spec, but
 * widely unsupported by browsers and many clients). Filtering options
 * therefore come as URL query parameters:
 *
 *   GET /reviews/products/abc-123?page=2&limit=10&rating=5
 *
 * All query params arrive as STRINGS. The @Type(() => Number) decorator
 * from class-transformer converts them to numbers so @IsInt() works correctly.
 * Without @Type, the value "5" (string) would fail @IsInt() (which expects number).
 */
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewFilterDto {
  /**
   * Page number (1-based).
   *
   * Page 1 = first 20 results, page 2 = next 20, etc.
   * The service translates this to SQL OFFSET: (page - 1) * limit
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  /**
   * Items per page.
   *
   * Capped at 50 to prevent clients from requesting hundreds of reviews
   * at once (protecting server memory and DB query time).
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 20;

  /**
   * Filter by exact star rating (optional).
   *
   * Useful for: "Show me only the 1-star reviews" (to find problems)
   * or "Show me only 5-star reviews" (to highlight on a landing page).
   *
   * When omitted, all ratings are returned.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;
}
