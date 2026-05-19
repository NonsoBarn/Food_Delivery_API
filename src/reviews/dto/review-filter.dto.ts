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
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewFilterDto {
  /**
   * Page number (1-based).
   *
   * Page 1 = first 20 results, page 2 = next 20, etc.
   * The service translates this to SQL OFFSET: (page - 1) * limit
   */
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 50, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5, description: 'Filter by exact star rating' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;
}
