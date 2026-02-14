/**
 * Order Filter DTO
 *
 * Query parameters for filtering, sorting, and paginating order lists.
 *
 * Used by:
 * - GET /api/v1/orders/my-orders (customer)
 * - GET /api/v1/orders/vendor-orders (vendor)
 * - GET /api/v1/orders (admin)
 *
 * Pagination Concept:
 * Instead of loading ALL orders at once (could be thousands),
 * we load them in "pages" of 20. The client sends:
 *   ?page=1&limit=20 → first 20 orders
 *   ?page=2&limit=20 → next 20 orders
 * The response includes `total` so the UI knows how many pages exist.
 */
import { IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderStatus } from '../enums/order-status.enum';

export class OrderFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by order status',
    enum: OrderStatus,
    example: OrderStatus.PENDING,
  })
  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Filter by vendor ID (admin only)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Vendor ID must be a valid UUID' })
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by customer ID (admin only)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter orders from this date (ISO 8601)',
    example: '2026-01-01',
  })
  @IsDateString({}, { message: 'fromDate must be a valid ISO 8601 date string' })
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter orders up to this date (ISO 8601)',
    example: '2026-12-31',
  })
  @IsDateString({}, { message: 'toDate must be a valid ISO 8601 date string' })
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['createdAt', 'total', 'status'],
    default: 'createdAt',
  })
  @IsOptional()
  sortBy?: 'createdAt' | 'total' | 'status';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of orders per page',
    example: 20,
    default: 20,
  })
  @Type(() => Number)
  @IsOptional()
  limit?: number;
}
