import {
  IsString,
  IsOptional,
  IsPhoneNumber,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '../entities/rider-profile.entity';

export class CreateRiderProfileDto {
  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsPhoneNumber(undefined, { message: 'Please provide a valid phone number' })
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'James' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Okafor' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ enum: VehicleType, example: VehicleType.MOTORCYCLE })
  @IsEnum(VehicleType, {
    message: `Vehicle type must be one of: ${Object.values(VehicleType).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Vehicle type is required' })
  vehicleType: VehicleType;

  @ApiPropertyOptional({ example: 'Honda CB300R' })
  @IsString()
  @IsOptional()
  vehicleModel?: string;

  @ApiPropertyOptional({ example: 'LAG-123-AB' })
  @IsString()
  @IsOptional()
  vehiclePlateNumber?: string;

  @ApiPropertyOptional({ example: 'Red' })
  @IsString()
  @IsOptional()
  vehicleColor?: string;
}
