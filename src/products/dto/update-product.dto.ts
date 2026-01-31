import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { ProductStatus } from '../enums/product-status.enum';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: 'Product status',
    enum: ProductStatus,
  })
  @IsEnum(ProductStatus, { message: 'Invalid product status' })
  @IsOptional()
  status?: ProductStatus;
}
