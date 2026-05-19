import { PartialType } from '@nestjs/swagger';
import { CreateRiderProfileDto } from './create-rider-profile.dto';

export class UpdateRiderProfileDto extends PartialType(CreateRiderProfileDto) {}
