import {
  IsString,
  IsOptional,
  IsPhoneNumber,
  IsNotEmpty,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorProfileDto {
  @ApiProperty({ example: 'Pizza Palace' })
  @IsString()
  @IsNotEmpty({ message: 'Business name is required' })
  businessName: string;

  @ApiPropertyOptional({ example: 'Authentic Neapolitan pizzas made fresh daily' })
  @IsString()
  @IsOptional()
  businessDescription?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsPhoneNumber(undefined, { message: 'Please provide a valid phone number' })
  @IsOptional()
  businessPhone?: string;

  @ApiPropertyOptional({ example: '5 Admiralty Way, Lekki Phase 1' })
  @IsString()
  @IsOptional()
  businessAddress?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '100001' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'RC-123456' })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional({
    example: {
      monday: { open: '09:00', close: '22:00' },
      friday: { open: '09:00', close: '23:00' },
    },
  })
  @IsObject()
  @IsOptional()
  businessHours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
}
