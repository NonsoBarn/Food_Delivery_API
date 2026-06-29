import { CreateProductDto } from './create-product.dto';
import { ProductStatus } from '../enums/product-status.enum';
declare const UpdateProductDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateProductDto>>;
export declare class UpdateProductDto extends UpdateProductDto_base {
    status?: ProductStatus;
}
export {};
