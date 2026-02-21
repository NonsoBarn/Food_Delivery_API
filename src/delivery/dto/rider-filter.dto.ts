import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  RiderStatus,
  AvailabilityStatus,
} from '../../users/entities/rider-profile.entity';

/**
 * DTO for filtering rider listings.
 *
 * KEY LEARNING: Query Parameter DTOs
 * ====================================
 * NestJS can validate query parameters the same way it validates request bodies.
 * Use @Query() in the controller with a DTO class.
 *
 * Important gotcha: Query parameters always arrive as STRINGS from HTTP.
 * @Type(() => Number) tells class-transformer to convert "10" → 10
 * before validation runs. Without it, @IsInt() would fail on "10".
 */
export class RiderFilterDto {
  @IsOptional()
  @IsEnum(RiderStatus)
  status?: RiderStatus;

  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
