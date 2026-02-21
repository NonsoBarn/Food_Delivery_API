import { IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * DTO for updating rider location.
 *
 * KEY LEARNING: Coordinate Validation
 * =====================================
 * Latitude ranges from -90 to +90 (south pole to north pole).
 * Longitude ranges from -180 to +180 (west to east from Greenwich).
 *
 * Always validate coordinates at the boundary! Invalid coordinates
 * can cause Redis GEO commands to fail silently or return wrong results.
 *
 * heading: The direction the rider is facing (0-360 degrees, 0 = North).
 * speed: Current speed in km/h. Both are optional — useful for the
 * frontend to show a directional arrow and ETA estimates.
 */
export class UpdateLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  speed?: number;
}
