import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectRiderDto {
  @ApiProperty({ example: 'Driver license is expired', maxLength: 500 })
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @MaxLength(500)
  rejectionReason: string;
}
