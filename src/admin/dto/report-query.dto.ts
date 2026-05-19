/**
 * ReportQueryDto
 *
 * Query parameters for GET /api/v1/admin/reports
 * e.g. /api/v1/admin/reports?period=monthly&startDate=2026-01-01&endDate=2026-03-31
 *
 * KEY LEARNING: Query Parameter DTOs
 * =====================================
 * Query params arrive as raw strings from the URL — even numbers like ?page=1
 * come in as the string "1". NestJS's ValidationPipe + @Query() converts them
 * into this class using class-transformer.
 *
 * The key difference vs @Body() DTOs:
 * - Body DTOs: Content-Type header tells the parser the format (JSON/form)
 * - Query DTOs: always plain strings, class-transformer coerces types
 *
 * In main.ts, we have ValidationPipe({ transform: true }). The `transform: true`
 * flag enables class-transformer to convert string query params to proper types.
 *
 * KEY LEARNING: Why use an enum for `period` instead of accepting any string?
 * =============================================================================
 * If we accepted any string, a client could send period=hourly or period=decade.
 * That value would reach the service, which maps it to a PostgreSQL DATE_TRUNC unit.
 * An invalid unit would cause a DB error, leaking internal SQL details.
 *
 * The enum constrains the valid values at the HTTP boundary — a bad value
 * gets a clear "400 Bad Request: period must be one of daily, weekly, monthly"
 * before the request ever touches the database. This is "fail fast" principle.
 *
 * KEY LEARNING: Default values in DTOs
 * ======================================
 * TypeScript property initializers (= ReportPeriod.DAILY) only work if
 * class-transformer creates a new instance. With NestJS ValidationPipe
 * and transform: true, this works correctly.
 * If `period` is omitted from the query string, the default 'daily' is used.
 */
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class ReportQueryDto {
  @ApiPropertyOptional({ enum: ReportPeriod, default: ReportPeriod.DAILY })
  @IsEnum(ReportPeriod, {
    message: 'period must be one of: daily, weekly, monthly',
  })
  @IsOptional()
  period?: ReportPeriod = ReportPeriod.DAILY;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Start date (ISO 8601, inclusive)' })
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date string' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-03-31', description: 'End date (ISO 8601, inclusive)' })
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  @IsOptional()
  endDate?: string;
}
