import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiProperty({
    description: 'Payment ID to refund',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  paymentId: string;

  @ApiPropertyOptional({
    description: 'Amount to refund. Omit for full refund.',
    example: 15.99,
  })
  @IsNumber()
  @IsOptional()
  @Min(0.01, { message: 'Refund amount must be at least 0.01' })
  amount?: number;

  @ApiPropertyOptional({
    description: 'Reason for the refund',
    example: 'Customer requested cancellation',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
