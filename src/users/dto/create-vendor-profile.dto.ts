import {
  IsString,
  IsOptional,
  IsPhoneNumber,
  IsNotEmpty,
  IsObject,
} from 'class-validator';

export class CreateVendorProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Business name is required' })
  businessName: string;

  @IsString()
  @IsOptional()
  businessDescription?: string;

  @IsPhoneNumber(undefined, { message: 'Please provide a valid phone number' })
  @IsOptional()
  businessPhone?: string;

  @IsString()
  @IsOptional()
  businessAddress?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  taxId?: string;

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
