import { Repository } from 'typeorm';
import { ProductImage } from './entities/product-image.entity';
import { Product } from './entities/product.entity';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { StorageFactoryService } from '../storage/storage-factory.service';
export declare class ProductImagesService {
    private readonly imageRepository;
    private readonly productRepository;
    private readonly storageFactory;
    constructor(imageRepository: Repository<ProductImage>, productRepository: Repository<Product>, storageFactory: StorageFactoryService);
    uploadImage(productId: string, file: Express.Multer.File, dto: UploadProductImageDto, userId: string, userRole: string): Promise<ProductImage>;
    getProductImages(productId: string): Promise<ProductImage[]>;
    setPrimaryImage(productId: string, imageId: string, userId: string, userRole: string): Promise<ProductImage>;
    updateDisplayOrder(productId: string, imageId: string, newOrder: number, userId: string, userRole: string): Promise<ProductImage>;
    deleteImage(productId: string, imageId: string, userId: string, userRole: string): Promise<void>;
    reorderImages(productId: string, ordering: Array<{
        imageId: string;
        order: number;
    }>, userId: string, userRole: string): Promise<ProductImage[]>;
    getTransformedUrl(imageUrl: string, transformation: {
        width?: number;
        height?: number;
        crop?: 'fill' | 'fit' | 'thumb' | 'scale';
        quality?: number;
        format?: 'auto' | 'webp' | 'jpg' | 'png';
    }): string;
}
