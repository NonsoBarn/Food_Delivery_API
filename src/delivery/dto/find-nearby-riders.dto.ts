import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for finding nearby riders.
 *
 * KEY LEARNING: Sensible Defaults
 * ================================
 * radiusKm defaults to 5 and limit to 10.
 * This means the API works with just lat/lng — no need to specify
 * every parameter. But power users can tune them.
 *
 * Max radius is 50km — beyond that, the rider is too far for a
 * reasonable delivery. This prevents accidental "search the entire planet" queries.
 */
export class FindNearbyRidersDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radiusKm?: number = 5;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
