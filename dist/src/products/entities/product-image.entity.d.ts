import { Product } from './product.entity';
export declare class ProductImage {
    id: string;
    imageUrl: string;
    publicId: string;
    altText: string;
    isPrimary: boolean;
    displayOrder: number;
    product: Product;
    productId: string;
    createdAt: Date;
}
