import { IsUUID } from 'class-validator';

export class AutoAssignDto {
  @IsUUID()
  orderId: string;
}
