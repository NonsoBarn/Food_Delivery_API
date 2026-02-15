import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '../enums/payment-provider.enum';

export class InitializePaymentDto {
  @ApiProperty({
    description: 'Order group ID from checkout',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  orderGroupId: string;

  @ApiProperty({
    description: 'Payment provider to use',
    enum: PaymentProvider,
    example: PaymentProvider.STRIPE,
  })
  @IsEnum(PaymentProvider, { message: 'Invalid payment provider' })
  provider: PaymentProvider;

  @ApiPropertyOptional({
    description: 'URL to redirect after payment (for hosted checkout)',
    example: 'https://myapp.com/payment/callback',
  })
  @IsString()
  @IsOptional()
  callbackUrl?: string;
}
