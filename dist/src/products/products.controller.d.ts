import { ProductsService } from './products.service';
import { ProductImagesService } from './product-images.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { ProductStatus } from './enums/product-status.enum';
import { User } from 'src/users/entities/user.entity';
export declare class ProductsController {
    private readonly productsService;
    private readonly productImagesService;
    constructor(productsService: ProductsService, productImagesService: ProductImagesService);
    create(createProductDto: CreateProductDto, user: User): Promise<import("./entities/product.entity").Product>;
    findAll(vendorId?: string, categoryId?: string, status?: ProductStatus, search?: string): Promise<import("./entities/product.entity").Product[]>;
    findMyProducts(user: User): Promise<import("./entities/product.entity").Product[]>;
    findOne(id: string): Promise<import("./entities/product.entity").Product>;
    update(id: string, updateProductDto: UpdateProductDto, user: User): Promise<import("./entities/product.entity").Product>;
    remove(id: string, user: User): Promise<void>;
    hardDelete(id: string): Promise<void>;
    uploadImage(productId: string, file: Express.Multer.File, dto: UploadProductImageDto, user: User): Promise<import("./entities/product-image.entity").ProductImage>;
    getProductImages(productId: string): Promise<import("./entities/product-image.entity").ProductImage[]>;
    setPrimaryImage(productId: string, imageId: string, user: User): Promise<import("./entities/product-image.entity").ProductImage>;
    updateImageOrder(productId: string, imageId: string, displayOrder: number, user: User): Promise<import("./entities/product-image.entity").ProductImage>;
    reorderImages(productId: string, ordering: Array<{
        imageId: string;
        order: number;
    }>, user: User): Promise<import("./entities/product-image.entity").ProductImage[]>;
    deleteImage(productId: string, imageId: string, user: User): Promise<void>;
}
