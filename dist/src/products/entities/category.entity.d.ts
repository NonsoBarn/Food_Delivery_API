import { Product } from '../../products/entities/product.entity';
export declare class Category {
    id: string;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    displayOrder: number;
    isActive: boolean;
    parent: Category;
    parentId: string;
    children: Category[];
    products: Product[];
    createdAt: Date;
    updatedAt: Date;
}
