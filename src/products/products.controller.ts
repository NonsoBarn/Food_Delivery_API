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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ProductStatus } from './enums/product-status.enum';
import { User } from 'src/users/entities/user.entity';

@Controller({
  path: 'products',
  version: '1',
})
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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
    // Extract vendor ID from authenticated user
    // For vendors: user.vendorProfile.id
    // For admins: could allow vendorId in DTO (future enhancement)
    const vendorId = user.vendorProfile?.id;

    if (!vendorId) {
      throw new Error(
        'Vendor profile not found. Please create a vendor profile first.',
      );
    }

    return await this.productsService.create(createProductDto, vendorId);
  }

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

  @Get('my-products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async findMyProducts(@CurrentUser() user: User) {
    const vendorId = user.vendorProfile?.id;

    if (!vendorId) {
      throw new Error('Vendor profile not found');
    }

    // Return all products for this vendor (including drafts, inactive, etc.)
    return await this.productsService.findAll({
      vendorId,
      // Don't filter by status - vendor sees all their products
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.productsService.findOne(id);
  }
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
   *
   * DELETE /api/v1/products/:id
   * Authorization: Product owner (vendor) or Admin
   
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
   *
   * DELETE /api/v1/products/:id/hard
   * Authorization: Admin only
   */
  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(@Param('id') id: string) {
    await this.productsService.hardDelete(id);
  }
}
