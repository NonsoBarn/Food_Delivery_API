import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteDeliveryDto {
  @ApiPropertyOptional({ example: 'Left at the gate with security', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNotes?: string;
}
