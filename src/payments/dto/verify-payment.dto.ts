import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({
    description: 'Payment transaction reference from the provider',
    example: 'pi_3abc123def456',
  })
  @IsString()
  reference: string;
}
