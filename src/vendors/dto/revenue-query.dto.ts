/**
 * RevenueQueryDto
 *
 * Query parameters for GET /api/v1/vendors/revenue
 * e.g. /api/v1/vendors/revenue?period=weekly&startDate=2026-01-01
 *
 * KEY LEARNING: Duplicating vs Sharing DTOs
 * ==========================================
 * This DTO is structurally similar to the admin's ReportQueryDto.
 * You might ask: "why not put this in src/common/dto/ and import from both?"
 *
 * Reasons to keep them separate (the "Rule of Three"):
 * - Two uses is NOT enough to justify an abstraction
 * - Admin reports and vendor revenue may evolve independently
 *   (e.g., admin might add ?vendorId filter, vendor adds ?productId filter)
 * - Coupling two modules to a shared DTO creates a hidden dependency
 *   — changing the shared DTO could break both modules unexpectedly
 *
 * The "Rule of Three" says: abstract when you have 3+ copies, not 2.
 * Two similar things can just be two separate things.
 *
 * KEY LEARNING: Enum definition scope
 * =====================================
 * RevenuePeriod is defined in THIS file (not imported from admin module).
 * This keeps the vendors module self-contained — it doesn't need to know
 * about the admin module's enum. If the admin module changes, vendors is unaffected.
 * This is the "loose coupling" principle applied to DTOs.
 */
import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum RevenuePeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class RevenueQueryDto {
  /**
   * Time granularity for the revenue breakdown:
   * - daily:   one data point per day (good for last 30 days view)
   * - weekly:  one data point per week (good for quarterly view)
   * - monthly: one data point per month (good for yearly view)
   */
  @IsEnum(RevenuePeriod, {
    message: 'period must be one of: daily, weekly, monthly',
  })
  @IsOptional()
  period?: RevenuePeriod = RevenuePeriod.DAILY;

  /**
   * Start date for the revenue query (inclusive).
   * Defaults to 30/84 days or 12 months ago based on period if not provided.
   */
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date string' })
  @IsOptional()
  startDate?: string;

  /**
   * End date for the revenue query (inclusive).
   * Defaults to today if not provided.
   */
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  @IsOptional()
  endDate?: string;
}
