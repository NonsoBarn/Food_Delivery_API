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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const slug_util_1 = require("../common/utils/slug.util");
const product_entity_1 = require("./entities/product.entity");
const product_image_entity_1 = require("./entities/product-image.entity");
const product_status_enum_1 = require("./enums/product-status.enum");
const categories_service_1 = require("./categories.service");
let ProductsService = class ProductsService {
    productRepository;
    productImageRepository;
    categoriesService;
    constructor(productRepository, productImageRepository, categoriesService) {
        this.productRepository = productRepository;
        this.productImageRepository = productImageRepository;
        this.categoriesService = categoriesService;
    }
    async create(createProductDto, vendorId) {
        const { name, categoryId, stock, status, ...rest } = createProductDto;
        await this.validateCategory(categoryId);
        const slug = await this.generateUniqueSlug(name, vendorId);
        let initialStatus = status || product_status_enum_1.ProductStatus.DRAFT;
        if (initialStatus === product_status_enum_1.ProductStatus.PUBLISHED &&
            (stock === 0 || stock === undefined)) {
            initialStatus = product_status_enum_1.ProductStatus.OUT_OF_STOCK;
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
    async findAll(filters) {
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
        }
        else {
            qb.andWhere('product.status = :status', {
                status: product_status_enum_1.ProductStatus.PUBLISHED,
            });
        }
        if (filters?.search) {
            qb.andWhere('(product.name ILIKE :search OR product.description ILIKE :search)', { search: `%${filters.search}%` });
        }
        return await qb.getMany();
    }
    async findOne(id) {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['category', 'vendor', 'images'],
            order: { images: { displayOrder: 'ASC' } },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        await this.productRepository.increment({ id }, 'viewCount', 1);
        return product;
    }
    async findBySlug(slug, vendorId) {
        const product = await this.productRepository.findOne({
            where: { slug, vendorId },
            relations: ['category', 'vendor', 'images'],
            order: { images: { displayOrder: 'ASC' } },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with slug "${slug}" not found for this vendor`);
        }
        await this.productRepository.increment({ id: product.id }, 'viewCount', 1);
        return product;
    }
    async update(id, updateProductDto, userId, userRole) {
        const product = await this.findOne(id);
        const { name, categoryId, stock, status, ...rest } = updateProductDto;
        if (userRole !== 'admin' && product.vendorId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to update this product');
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
            if (stock === 0 && product.status === product_status_enum_1.ProductStatus.PUBLISHED) {
                product.status = product_status_enum_1.ProductStatus.OUT_OF_STOCK;
            }
            else if (stock > 0 &&
                product.status === product_status_enum_1.ProductStatus.OUT_OF_STOCK &&
                oldStock === 0) {
                product.status = product_status_enum_1.ProductStatus.PUBLISHED;
            }
        }
        if (status !== undefined) {
            product.status = status;
        }
        Object.assign(product, rest);
        await this.productRepository.save(product);
        return this.findOne(id);
    }
    async remove(id, userId, userRole) {
        const product = await this.findOne(id);
        if (userRole !== 'admin' && product.vendorId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to delete this product');
        }
        product.status = product_status_enum_1.ProductStatus.INACTIVE;
        await this.productRepository.save(product);
    }
    async hardDelete(id) {
        const product = await this.findOne(id);
        await this.productRepository.remove(product);
    }
    async validateCategory(categoryId) {
        const category = await this.categoriesService.findOne(categoryId);
        if (!category.isActive) {
            throw new common_1.BadRequestException(`Category "${category.name}" is not active. Please choose an active category.`);
        }
    }
    async generateUniqueSlug(name, vendorId, excludeId) {
        const baseSlug = (0, slug_util_1.slugify)(name);
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
    async updateStock(productId, quantity) {
        const product = await this.findOne(productId);
        if (product.stock === -1) {
            return product;
        }
        product.stock -= quantity;
        if (product.stock < 0) {
            throw new common_1.BadRequestException(`Insufficient stock for ${product.name}. Available: ${product.stock + quantity}`);
        }
        if (product.stock === 0 && product.status === product_status_enum_1.ProductStatus.PUBLISHED) {
            product.status = product_status_enum_1.ProductStatus.OUT_OF_STOCK;
        }
        await this.productRepository.save(product);
        return product;
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(product_image_entity_1.ProductImage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        categories_service_1.CategoriesService])
], ProductsService);
//# sourceMappingURL=products.service.js.map