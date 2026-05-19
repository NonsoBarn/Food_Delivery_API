import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelDeliveryDto {
  @ApiProperty({ example: 'Rider had an emergency', maxLength: 500 })
  @IsString()
  @IsNotEmpty({ message: 'Cancellation reason is required' })
  @MaxLength(500)
  cancellationReason: string;
}
