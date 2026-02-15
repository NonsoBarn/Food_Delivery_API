import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProviderConfigDto {
  @ApiPropertyOptional({
    description: 'Enable or disable this provider for customers',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Display name shown to customers at checkout',
    example: 'Pay with Card (Stripe)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Description shown on the checkout page',
    example: 'Secure card payment powered by Stripe',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Currencies supported by this provider on the platform',
    example: ['USD', 'EUR'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedCurrencies?: string[];

  @ApiPropertyOptional({
    description: 'Platform fee as percentage (e.g., 15.00 = 15%)',
    example: 15.0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  platformFeePercentage?: number;

  @ApiPropertyOptional({
    description: 'Fixed platform fee per transaction',
    example: 0.5,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  platformFeeFixed?: number;
}
