import { IsEnum, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AvailabilityStatus } from '../../users/entities/rider-profile.entity';

export class UpdateAvailabilityDto {
  @ApiProperty({
    enum: [AvailabilityStatus.ONLINE, AvailabilityStatus.OFFLINE],
    example: AvailabilityStatus.ONLINE,
    description: 'Riders can only set online or offline (busy is system-managed)',
  })
  @IsEnum(AvailabilityStatus)
  @IsIn([AvailabilityStatus.ONLINE, AvailabilityStatus.OFFLINE], {
    message: 'You can only set availability to online or offline',
  })
  availabilityStatus: AvailabilityStatus;
}
