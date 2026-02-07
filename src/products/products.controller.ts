import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { ProductImagesService } from './product-images.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ProductStatus } from './enums/product-status.enum';
import { User } from 'src/users/entities/user.entity';

/**
 * Products Controller
 *
 * Handles all HTTP requests for product and product image management.
 * Routes: /api/v1/products
 */
@Controller({
  path: 'products',
  version: '1',
})
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productImagesService: ProductImagesService,
  ) {}

  /**
   * Create a new product
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User,
  ) {
    const vendorId = user.vendorProfile?.id;

    if (!vendorId) {
      throw new Error(
        'Vendor profile not found. Please create a vendor profile first.',
      );
    }

    return await this.productsService.create(createProductDto, vendorId);
  }

  /**
   * Get all products (with filtering)
   */
  @Get()
  async findAll(
    @Query('vendorId') vendorId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: ProductStatus,
    @Query('search') search?: string,
  ) {
    return await this.productsService.findAll({
      vendorId,
      categoryId,
      status,
      search,
    });
  }

  /**
   * Get vendor's own products
   */
  @Get('my-products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async findMyProducts(@CurrentUser() user: User) {
    const vendorId = user.vendorProfile?.id;

    if (!vendorId) {
      throw new Error('Vendor profile not found');
    }

    return await this.productsService.findAll({
      vendorId,
    });
  }

  /**
   * Get single product by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.productsService.findOne(id);
  }

  /**
   * Update product
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: User,
  ) {
    return await this.productsService.update(
      id,
      updateProductDto,
      user.vendorProfile?.id || user.id,
      user.role,
    );
  }

  /**
   * Soft delete product
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.productsService.remove(
      id,
      user.vendorProfile?.id || user.id,
      user.role,
    );
  }

  /**
   * Hard delete product
   */
  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(@Param('id') id: string) {
    await this.productsService.hardDelete(id);
  }

  // ==================== IMAGE ENDPOINTS ====================

  /**
   * Upload product image
   *
   * POST /api/v1/products/:productId/images
   */
  @Post(':productId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadImage(
    @Param('productId') productId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadProductImageDto,
    @CurrentUser() user: User,
  ) {
    return await this.productImagesService.uploadImage(
      productId,
      file,
      dto,
      user.vendorProfile?.id || user.id,
      user.role,
    );
  }

  /**
   * Get all images for a product
   *
   * GET /api/v1/products/:productId/images
   */
  @Get(':productId/images')
  async getProductImages(@Param('productId') productId: string) {
    return await this.productImagesService.getProductImages(productId);
  }

  /**
   * Set primary image
   *
   * PATCH /api/v1/products/:productId/images/:imageId/primary
   */
  @Patch(':productId/images/:imageId/primary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async setPrimaryImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: User,
  ) {
    return await this.productImagesService.setPrimaryImage(
      productId,
      imageId,
      user.vendorProfile?.id || user.id,
      user.role,
    );
  }

  /**
   * Update image display order
   *
   * PATCH /api/v1/products/:productId/images/:imageId/order
   */
  @Patch(':productId/images/:imageId/order')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async updateImageOrder(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Body('displayOrder') displayOrder: number,
    @CurrentUser() user: User,
  ) {
    return await this.productImagesService.updateDisplayOrder(
      productId,
      imageId,
      displayOrder,
      user.vendorProfile?.id || user.id,
      user.role,
    );
  }

  /**
   * Bulk reorder images
   *
   * PATCH /api/v1/products/:productId/images/reorder
   */
  @Patch(':productId/images/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async reorderImages(
    @Param('productId') productId: string,
    @Body('ordering') ordering: Array<{ imageId: string; order: number }>,
    @CurrentUser() user: User,
  ) {
    return await this.productImagesService.reorderImages(
      productId,
      ordering,
      user.vendorProfile?.id || user.id,
      user.role,
    );
  }

  /**
   * Delete product image
   *
   * DELETE /api/v1/products/:productId/images/:imageId
   */
  @Delete(':productId/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: User,
  ) {
    await this.productImagesService.deleteImage(
      productId,
      imageId,
      user.vendorProfile?.id || user.id,
      user.role,
    );
  }
}
