import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { slugify } from '../common/utils/slug.util';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus } from './enums/product-status.enum';
import { CategoriesService } from './categories.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    private readonly categoriesService: CategoriesService,
  ) {}

  /**
   * Create a new product
   */
  async create(
    createProductDto: CreateProductDto,
    vendorId: string,
  ): Promise<Product> {
    const { name, categoryId, stock, status, ...rest } = createProductDto;

    await this.validateCategory(categoryId);

    const slug = await this.generateUniqueSlug(name, vendorId);

    let initialStatus = status || ProductStatus.DRAFT;

    if (
      initialStatus === ProductStatus.PUBLISHED &&
      (stock === 0 || stock === undefined)
    ) {
      initialStatus = ProductStatus.OUT_OF_STOCK;
    }

    const product = this.productRepository.create({
      name,
      slug,
      categoryId,
      vendorId,
      stock: stock ?? 0,
      status: initialStatus,
      ...rest,
    });

    const savedProduct = await this.productRepository.save(product);
    return this.findOne(savedProduct.id);
  }

  /**
   * Get all products with filtering
   */
  async findAll(filters?: {
    vendorId?: string;
    categoryId?: string;
    status?: ProductStatus;
    search?: string;
  }): Promise<Product[]> {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.vendor', 'vendor')
      .leftJoinAndSelect('product.images', 'images')
      .orderBy('product.createdAt', 'DESC');

    if (filters?.vendorId) {
      qb.andWhere('product.vendorId = :vendorId', {
        vendorId: filters.vendorId,
      });
    }

    if (filters?.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.status) {
      qb.andWhere('product.status = :status', { status: filters.status });
    } else {
      qb.andWhere('product.status = :status', {
        status: ProductStatus.PUBLISHED,
      });
    }

    if (filters?.search) {
      qb.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return await qb.getMany();
  }

  /**
   * Get single product by ID
   */
  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'vendor', 'images'],
      order: { images: { displayOrder: 'ASC' } },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.productRepository.increment({ id }, 'viewCount', 1);
    return product;
  }

  /**
   * Get product by slug and vendor
   */
  async findBySlug(slug: string, vendorId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { slug, vendorId },
      relations: ['category', 'vendor', 'images'],
      order: { images: { displayOrder: 'ASC' } },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with slug "${slug}" not found for this vendor`,
      );
    }

    await this.productRepository.increment({ id: product.id }, 'viewCount', 1);
    return product;
  }

  /**
   * Update product
   */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId: string,
    userRole: string,
  ): Promise<Product> {
    const product = await this.findOne(id);
    const { name, categoryId, stock, status, ...rest } = updateProductDto;

    if (userRole !== 'admin' && product.vendorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this product',
      );
    }

    if (categoryId && categoryId !== product.categoryId) {
      await this.validateCategory(categoryId);
      product.categoryId = categoryId;
    }

    if (name && name !== product.name) {
      product.name = name;
      product.slug = await this.generateUniqueSlug(name, product.vendorId, id);
    }

    if (stock !== undefined) {
      const oldStock = product.stock;
      product.stock = stock;

      if (stock === 0 && product.status === ProductStatus.PUBLISHED) {
        product.status = ProductStatus.OUT_OF_STOCK;
      } else if (
        stock > 0 &&
        product.status === ProductStatus.OUT_OF_STOCK &&
        oldStock === 0
      ) {
        product.status = ProductStatus.PUBLISHED;
      }
    }

    if (status !== undefined) {
      product.status = status;
    }

    Object.assign(product, rest);
    await this.productRepository.save(product);
    return this.findOne(id);
  }

  /**
   * Soft delete product (set status to INACTIVE)
   */
  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const product = await this.findOne(id);

    if (userRole !== 'admin' && product.vendorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this product',
      );
    }

    product.status = ProductStatus.INACTIVE;
    await this.productRepository.save(product);
  }

  /**
   * Hard delete product - DANGEROUS
   */
  async hardDelete(id: string): Promise<void> {
    const product = await this.findOne(id);
    // TODO: Delete images from Cloudinary before hard delete
    await this.productRepository.remove(product);
  }

  /**
   * Validate category exists and is active
   */
  private async validateCategory(categoryId: string): Promise<void> {
    const category = await this.categoriesService.findOne(categoryId);

    if (!category.isActive) {
      throw new BadRequestException(
        `Category "${category.name}" is not active. Please choose an active category.`,
      );
    }
  }

  /**
   * Generate unique slug for product using custom slugifier
   *
   * Uniqueness scope: slug is unique per vendor (vendorId + slug = compound unique)
   */
  private async generateUniqueSlug(
    name: string,
    vendorId: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = slugify(name);
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.productRepository.findOne({
        where: { slug: uniqueSlug, vendorId },
      });

      if (!existing || existing.id === excludeId) {
        break;
      }

      counter++;
      uniqueSlug = `${baseSlug}-${counter}`;
    }

    return uniqueSlug;
  }

  /**
   * Update product stock (used by order system)
   */
  async updateStock(productId: string, quantity: number): Promise<Product> {
    const product = await this.findOne(productId);

    if (product.stock === -1) {
      return product;
    }

    product.stock -= quantity;

    if (product.stock < 0) {
      throw new BadRequestException(
        `Insufficient stock for ${product.name}. Available: ${product.stock + quantity}`,
      );
    }

    if (product.stock === 0 && product.status === ProductStatus.PUBLISHED) {
      product.status = ProductStatus.OUT_OF_STOCK;
    }

    await this.productRepository.save(product);
    return product;
  }
}
