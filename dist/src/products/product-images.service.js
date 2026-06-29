"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductImagesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_image_entity_1 = require("./entities/product-image.entity");
const product_entity_1 = require("./entities/product.entity");
const storage_factory_service_1 = require("../storage/storage-factory.service");
let ProductImagesService = class ProductImagesService {
    imageRepository;
    productRepository;
    storageFactory;
    constructor(imageRepository, productRepository, storageFactory) {
        this.imageRepository = imageRepository;
        this.productRepository = productRepository;
        this.storageFactory = storageFactory;
    }
    async uploadImage(productId, file, dto, userId, userRole) {
        const product = await this.productRepository.findOne({
            where: { id: productId },
            relations: ['images'],
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${productId} not found`);
        }
        if (userRole !== 'admin' && product.vendorId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to upload images for this product');
        }
        const storageService = this.storageFactory.getStorageService('image');
        const uploadResult = await storageService.upload(file, {
            folder: `products/${product.vendorId}/${productId}`,
        });
        const isFirstImage = !product.images || product.images.length === 0;
        const isPrimary = dto.isPrimary ?? isFirstImage;
        if (isPrimary) {
            await this.imageRepository.update({ productId }, { isPrimary: false });
        }
        let displayOrder = dto.displayOrder;
        if (!displayOrder) {
            const maxOrder = await this.imageRepository
                .createQueryBuilder('image')
                .select('MAX(image.displayOrder)', 'max')
                .where('image.productId = :productId', { productId })
                .getRawOne();
            displayOrder = (maxOrder?.max || 0) + 1;
        }
        const altText = dto.altText || `${product.name} - Image ${displayOrder}`;
        const image = this.imageRepository.create({
            productId,
            imageUrl: uploadResult.url,
            publicId: uploadResult.key,
            altText,
            isPrimary,
            displayOrder,
        });
        return await this.imageRepository.save(image);
    }
    async getProductImages(productId) {
        return await this.imageRepository.find({
            where: { productId },
            order: { displayOrder: 'ASC' },
        });
    }
    async setPrimaryImage(productId, imageId, userId, userRole) {
        const image = await this.imageRepository.findOne({
            where: { id: imageId, productId },
            relations: ['product'],
        });
        if (!image) {
            throw new common_1.NotFoundException(`Image with ID ${imageId} not found for this product`);
        }
        if (userRole !== 'admin' && image.product.vendorId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to modify this image');
        }
        await this.imageRepository.update({ productId }, { isPrimary: false });
        image.isPrimary = true;
        return await this.imageRepository.save(image);
    }
    async updateDisplayOrder(productId, imageId, newOrder, userId, userRole) {
        const image = await this.imageRepository.findOne({
            where: { id: imageId, productId },
            relations: ['product'],
        });
        if (!image) {
            throw new common_1.NotFoundException(`Image with ID ${imageId} not found for this product`);
        }
        if (userRole !== 'admin' && image.product.vendorId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to modify this image');
        }
        image.displayOrder = newOrder;
        return await this.imageRepository.save(image);
    }
    async deleteImage(productId, imageId, userId, userRole) {
        const image = await this.imageRepository.findOne({
            where: { id: imageId, productId },
            relations: ['product'],
        });
        if (!image) {
            throw new common_1.NotFoundException(`Image with ID ${imageId} not found for this product`);
        }
        if (userRole !== 'admin' && image.product.vendorId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to delete this image');
        }
        const wasPrimary = image.isPrimary;
        const storageService = this.storageFactory.getStorageService('image');
        try {
            await storageService.delete(image.publicId);
        }
        catch (error) {
            console.error('Failed to delete from Cloudinary:', error);
        }
        await this.imageRepository.remove(image);
        if (wasPrimary) {
            const remainingImages = await this.imageRepository.find({
                where: { productId },
                order: { displayOrder: 'ASC' },
                take: 1,
            });
            if (remainingImages.length > 0) {
                remainingImages[0].isPrimary = true;
                await this.imageRepository.save(remainingImages[0]);
            }
        }
    }
    async reorderImages(productId, ordering, userId, userRole) {
        const product = await this.productRepository.findOne({
            where: { id: productId },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${productId} not found`);
        }
        if (userRole !== 'admin' && product.vendorId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to reorder images for this product');
        }
        const updatePromises = ordering.map(({ imageId, order }) => this.imageRepository.update({ id: imageId, productId }, { displayOrder: order }));
        await Promise.all(updatePromises);
        return await this.getProductImages(productId);
    }
    getTransformedUrl(imageUrl, transformation) {
        const { width = 600, height = 600, crop = 'fill', quality = 80, format = 'auto', } = transformation;
        const transformStr = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
        return imageUrl.replace('/upload/', `/upload/${transformStr}/`);
    }
};
exports.ProductImagesService = ProductImagesService;
exports.ProductImagesService = ProductImagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_image_entity_1.ProductImage)),
    __param(1, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        storage_factory_service_1.StorageFactoryService])
], ProductImagesService);
//# sourceMappingURL=product-images.service.js.map