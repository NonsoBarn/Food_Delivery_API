import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus } from './enums/product-status.enum';
import { CategoriesService } from './categories.service';
export declare class ProductsService {
    private readonly productRepository;
    private readonly productImageRepository;
    private readonly categoriesService;
    constructor(productRepository: Repository<Product>, productImageRepository: Repository<ProductImage>, categoriesService: CategoriesService);
    create(createProductDto: CreateProductDto, vendorId: string): Promise<Product>;
    findAll(filters?: {
        vendorId?: string;
        categoryId?: string;
        status?: ProductStatus;
        search?: string;
    }): Promise<Product[]>;
    findOne(id: string): Promise<Product>;
    findBySlug(slug: string, vendorId: string): Promise<Product>;
    update(id: string, updateProductDto: UpdateProductDto, userId: string, userRole: string): Promise<Product>;
    remove(id: string, userId: string, userRole: string): Promise<void>;
    hardDelete(id: string): Promise<void>;
    private validateCategory;
    private generateUniqueSlug;
    updateStock(productId: string, quantity: number): Promise<Product>;
}
