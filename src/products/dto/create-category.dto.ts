import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Burgers',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  @MaxLength(50, { message: 'Category name must not exceed 50 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Category description for SEO and user information',
    example: 'Delicious burgers from top restaurants',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Category image URL (Cloudinary)',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234/categories/burgers.jpg',
  })
  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Display order (lower numbers appear first)',
    example: 10,
    minimum: 0,
  })
  @IsInt({ message: 'Display order must be an integer' })
  @Min(0, { message: 'Display order cannot be negative' })
  @IsOptional()
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Parent category ID (null for root categories)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Parent ID must be a valid UUID' })
  @IsOptional()
  parentId?: string;
}
