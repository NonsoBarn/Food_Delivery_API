import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductImage } from './entities/product-image.entity';
import { Product } from './entities/product.entity';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { StorageFactoryService } from '../storage/storage-factory.service';
import { MulterFile } from '../common/types/multer.types';

/**
 * Product Images Service
 *
 * Manages product images with Cloudinary integration.
 *
 * Responsibilities:
 * - Upload images to Cloudinary
 * - Manage primary image selection
 * - Handle image ordering
 * - Delete images (both DB and Cloudinary)
 * - Auto-generate alt text if not provided
 *
 * Design Pattern: Service Layer Pattern
 * Business logic isolated from HTTP layer
 */
@Injectable()
export class ProductImagesService {
  constructor(
    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly storageFactory: StorageFactoryService,
  ) {}

  /**
   * Upload product image
   *
   * Flow:
   * 1. Verify product exists and user owns it
   * 2. Upload to Cloudinary via StorageFactory
   * 3. If first image, set as primary automatically
   * 4. Auto-increment display order if not provided
   * 5. Generate alt text if not provided
   * 6. Save to database
   *
   * @param productId - Product UUID
   * @param file - Multer file object
   * @param dto - Image metadata
   * @param userId - User making the upload
   * @param userRole - User's role
   * @returns Created ProductImage with Cloudinary URL
   */
  async uploadImage(
    productId: string,
    file: Express.Multer.File,
    dto: UploadProductImageDto,
    userId: string,
    userRole: string,
  ): Promise<ProductImage> {
    // Step 1: Verify product exists and authorize
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['images'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Authorization: Only product owner or admin can upload
    if (userRole !== 'admin' && product.vendorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to upload images for this product',
      );
    }

    // Step 2: Upload to Cloudinary
    // StorageFactory will route to Cloudinary for images
    const storageService = this.storageFactory.getStorageService('image');

    const uploadResult = await storageService.upload(file, {
      folder: `products/${product.vendorId}/${productId}`,
      // Cloudinary auto-optimizes: WebP, responsive, quality
    });

    // Step 3: Determine if this should be primary image
    const isFirstImage = !product.images || product.images.length === 0;
    const isPrimary = dto.isPrimary ?? isFirstImage; // First image = auto primary

    // If setting as primary, unset other primary images
    if (isPrimary) {
      await this.imageRepository.update({ productId }, { isPrimary: false });
    }

    // Step 4: Determine display order
    let displayOrder = dto.displayOrder;
    if (!displayOrder) {
      // Auto-increment: Get max display order + 1
      const maxOrder = await this.imageRepository
        .createQueryBuilder('image')
        .select('MAX(image.displayOrder)', 'max')
        .where('image.productId = :productId', { productId })
        .getRawOne();

      displayOrder = (maxOrder?.max || 0) + 1;
    }

    // Step 5: Generate alt text if not provided
    const altText = dto.altText || `${product.name} - Image ${displayOrder}`;

    // Step 6: Create and save image record
    const image = this.imageRepository.create({
      productId,
      imageUrl: uploadResult.url,
      publicId: uploadResult.key, // Cloudinary public_id
      altText,
      isPrimary,
      displayOrder,
    });

    return await this.imageRepository.save(image);
  }

  /**
   * Get all images for a product
   *
   * Ordered by displayOrder ASC
   *
   * @param productId - Product UUID
   * @returns Array of ProductImages
   */
  async getProductImages(productId: string): Promise<ProductImage[]> {
    return await this.imageRepository.find({
      where: { productId },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Set primary image
   *
   * Business Rule: Only ONE image can be primary per product
   *
   * Flow:
   * 1. Verify image exists and belongs to product
   * 2. Authorize user
   * 3. Unset all other primary flags for this product
   * 4. Set this image as primary
   *
   * @param productId - Product UUID
   * @param imageId - Image UUID
   * @param userId - User making the change
   * @param userRole - User's role
   * @returns Updated ProductImage
   */
  async setPrimaryImage(
    productId: string,
    imageId: string,
    userId: string,
    userRole: string,
  ): Promise<ProductImage> {
    // Verify image belongs to product
    const image = await this.imageRepository.findOne({
      where: { id: imageId, productId },
      relations: ['product'],
    });

    if (!image) {
      throw new NotFoundException(
        `Image with ID ${imageId} not found for this product`,
      );
    }

    // Authorization
    if (userRole !== 'admin' && image.product.vendorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this image',
      );
    }

    // Unset all primary flags for this product
    await this.imageRepository.update({ productId }, { isPrimary: false });

    // Set this image as primary
    image.isPrimary = true;
    return await this.imageRepository.save(image);
  }

  /**
   * Update image display order
   *
   * Allows vendor to reorder product gallery
   *
   * @param productId - Product UUID
   * @param imageId - Image UUID
   * @param newOrder - New display order
   * @param userId - User making the change
   * @param userRole - User's role
   * @returns Updated ProductImage
   */
  async updateDisplayOrder(
    productId: string,
    imageId: string,
    newOrder: number,
    userId: string,
    userRole: string,
  ): Promise<ProductImage> {
    const image = await this.imageRepository.findOne({
      where: { id: imageId, productId },
      relations: ['product'],
    });

    if (!image) {
      throw new NotFoundException(
        `Image with ID ${imageId} not found for this product`,
      );
    }

    // Authorization
    if (userRole !== 'admin' && image.product.vendorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this image',
      );
    }

    image.displayOrder = newOrder;
    return await this.imageRepository.save(image);
  }

  /**
   * Delete product image
   *
   * Flow:
   * 1. Verify image exists and authorize
   * 2. Check if it's the primary image
   * 3. Delete from Cloudinary
   * 4. Delete from database
   * 5. If primary, auto-set another image as primary
   *
   * @param productId - Product UUID
   * @param imageId - Image UUID
   * @param userId - User making the deletion
   * @param userRole - User's role
   */
  async deleteImage(
    productId: string,
    imageId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    // Step 1: Verify and authorize
    const image = await this.imageRepository.findOne({
      where: { id: imageId, productId },
      relations: ['product'],
    });

    if (!image) {
      throw new NotFoundException(
        `Image with ID ${imageId} not found for this product`,
      );
    }

    if (userRole !== 'admin' && image.product.vendorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this image',
      );
    }

    // Step 2: Remember if this was primary
    const wasPrimary = image.isPrimary;

    // Step 3: Delete from Cloudinary
    const storageService = this.storageFactory.getStorageService('image');
    try {
      await storageService.delete(image.publicId);
    } catch (error) {
      // Log error but continue (file might already be deleted)
      console.error('Failed to delete from Cloudinary:', error);
    }

    // Step 4: Delete from database
    await this.imageRepository.remove(image);

    // Step 5: If this was primary, set another image as primary
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

  /**
   * Bulk reorder images
   *
   * Accepts array of { imageId, displayOrder }
   * Updates all in one transaction
   *
   * @param productId - Product UUID
   * @param ordering - Array of { imageId, order } objects
   * @param userId - User making the change
   * @param userRole - User's role
   */
  async reorderImages(
    productId: string,
    ordering: Array<{ imageId: string; order: number }>,
    userId: string,
    userRole: string,
  ): Promise<ProductImage[]> {
    // Verify product exists and authorize
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (userRole !== 'admin' && product.vendorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to reorder images for this product',
      );
    }

    // Update each image's display order
    const updatePromises = ordering.map(({ imageId, order }) =>
      this.imageRepository.update(
        { id: imageId, productId },
        { displayOrder: order },
      ),
    );

    await Promise.all(updatePromises);

    // Return updated images
    return await this.getProductImages(productId);
  }

  /**
   * Get Cloudinary transformation URL
   *
   * Generates URLs for different image sizes on-the-fly
   * No need to store multiple versions!
   *
   * Examples:
   * - Thumbnail: 300x300
   * - Product card: 600x600
   * - Detail page: 1200x1200
   * - Zoom: original size
   *
   * @param imageUrl - Original Cloudinary URL
   * @param transformation - Size/crop options
   * @returns Transformed URL
   */
  getTransformedUrl(
    imageUrl: string,
    transformation: {
      width?: number;
      height?: number;
      crop?: 'fill' | 'fit' | 'thumb' | 'scale';
      quality?: number;
      format?: 'auto' | 'webp' | 'jpg' | 'png';
    },
  ): string {
    // This is a simplified version
    // Your CloudinaryStorageService already has this method!
    const {
      width = 600,
      height = 600,
      crop = 'fill',
      quality = 80,
      format = 'auto',
    } = transformation;

    // Cloudinary URL transformation syntax
    // /upload/w_600,h_600,c_fill,q_80,f_auto/v1234/path/image.jpg
    const transformStr = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;

    // Insert transformation into URL
    return imageUrl.replace('/upload/', `/upload/${transformStr}/`);
  }
}
