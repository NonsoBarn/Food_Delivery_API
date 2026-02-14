/**
 * Update Order Status DTO
 *
 * Used when changing an order's status (e.g., vendor confirms, rider delivers).
 *
 * The status field is validated against the state machine in the service,
 * but the DTO ensures the value is a valid OrderStatus enum member.
 *
 * Optional fields:
 * - cancellationReason: Required when cancelling (enforced in service logic)
 * - estimatedPrepTimeMinutes: Set by vendor when confirming
 */
import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderStatus } from '../enums/order-status.enum';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New order status',
    enum: OrderStatus,
    example: OrderStatus.CONFIRMED,
  })
  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  status: OrderStatus;

  @ApiPropertyOptional({
    description: 'Reason for cancellation (required when status is "cancelled")',
    example: 'Out of ingredients for this dish',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Cancellation reason must not exceed 500 characters' })
  cancellationReason?: string;

  @ApiPropertyOptional({
    description:
      'Estimated preparation time in minutes. Set by vendor when confirming the order.',
    example: 30,
    minimum: 1,
    maximum: 180,
  })
  @Type(() => Number)
  @IsInt({ message: 'Estimated prep time must be an integer' })
  @Min(1, { message: 'Estimated prep time must be at least 1 minute' })
  @Max(180, { message: 'Estimated prep time cannot exceed 180 minutes' })
  @IsOptional()
  estimatedPrepTimeMinutes?: number;
}
