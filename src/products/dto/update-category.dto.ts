import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({
    description: 'Category active status (false = soft delete)',
    example: true,
  })
  @IsBoolean({ message: 'Active status must be a boolean' })
  @IsOptional()
  isActive?: boolean;
}
