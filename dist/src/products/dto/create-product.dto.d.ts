import { ProductStatus } from '../enums/product-status.enum';
export declare class CreateProductDto {
    name: string;
    description: string;
    price: number;
    categoryId: string;
    sku?: string;
    stock?: number;
    lowStockThreshold?: number;
    status?: ProductStatus;
}
