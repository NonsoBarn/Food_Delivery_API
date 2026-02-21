import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CancelDeliveryDto {
  @IsString()
  @IsNotEmpty({ message: 'Cancellation reason is required' })
  @MaxLength(500)
  cancellationReason: string;
}
