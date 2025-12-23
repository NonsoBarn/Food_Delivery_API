import {
  IsString,
  IsOptional,
  IsPhoneNumber,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { VehicleType } from '../entities/rider-profile.entity';

export class CreateRiderProfileDto {
  @IsPhoneNumber(undefined, { message: 'Please provide a valid phone number' })
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(VehicleType, {
    message: `Vehicle type must be one of: ${Object.values(VehicleType).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Vehicle type is required' })
  vehicleType: VehicleType;

  @IsString()
  @IsOptional()
  vehicleModel?: string;

  @IsString()
  @IsOptional()
  vehiclePlateNumber?: string;

  @IsString()
  @IsOptional()
  vehicleColor?: string;
}
