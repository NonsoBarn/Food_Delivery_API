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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const products_service_1 = require("./products.service");
const product_images_service_1 = require("./product-images.service");
const create_product_dto_1 = require("./dto/create-product.dto");
const update_product_dto_1 = require("./dto/update-product.dto");
const upload_product_image_dto_1 = require("./dto/upload-product-image.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const product_status_enum_1 = require("./enums/product-status.enum");
const user_entity_1 = require("../users/entities/user.entity");
let ProductsController = class ProductsController {
    productsService;
    productImagesService;
    constructor(productsService, productImagesService) {
        this.productsService = productsService;
        this.productImagesService = productImagesService;
    }
    async create(createProductDto, user) {
        const vendorId = user.vendorProfile?.id;
        if (!vendorId) {
            throw new Error('Vendor profile not found. Please create a vendor profile first.');
        }
        return await this.productsService.create(createProductDto, vendorId);
    }
    async findAll(vendorId, categoryId, status, search) {
        return await this.productsService.findAll({
            vendorId,
            categoryId,
            status,
            search,
        });
    }
    async findMyProducts(user) {
        const vendorId = user.vendorProfile?.id;
        if (!vendorId) {
            throw new Error('Vendor profile not found');
        }
        return await this.productsService.findAll({
            vendorId,
        });
    }
    async findOne(id) {
        return await this.productsService.findOne(id);
    }
    async update(id, updateProductDto, user) {
        return await this.productsService.update(id, updateProductDto, user.vendorProfile?.id || user.id, user.role);
    }
    async remove(id, user) {
        await this.productsService.remove(id, user.vendorProfile?.id || user.id, user.role);
    }
    async hardDelete(id) {
        await this.productsService.hardDelete(id);
    }
    async uploadImage(productId, file, dto, user) {
        return await this.productImagesService.uploadImage(productId, file, dto, user.vendorProfile?.id || user.id, user.role);
    }
    async getProductImages(productId) {
        return await this.productImagesService.getProductImages(productId);
    }
    async setPrimaryImage(productId, imageId, user) {
        return await this.productImagesService.setPrimaryImage(productId, imageId, user.vendorProfile?.id || user.id, user.role);
    }
    async updateImageOrder(productId, imageId, displayOrder, user) {
        return await this.productImagesService.updateDisplayOrder(productId, imageId, displayOrder, user.vendorProfile?.id || user.id, user.role);
    }
    async reorderImages(productId, ordering, user) {
        return await this.productImagesService.reorderImages(productId, ordering, user.vendorProfile?.id || user.id, user.role);
    }
    async deleteImage(productId, imageId, user) {
        await this.productImagesService.deleteImage(productId, imageId, user.vendorProfile?.id || user.id, user.role);
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR, user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a product', description: 'Roles: vendor, admin' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Product created' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_product_dto_1.CreateProductDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List products with optional filters' }),
    (0, swagger_1.ApiQuery)({ name: 'vendorId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'categoryId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: product_status_enum_1.ProductStatus }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of products' }),
    __param(0, (0, common_1.Query)('vendorId')),
    __param(1, (0, common_1.Query)('categoryId')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('my-products'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR, user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Get vendor's own products", description: 'Roles: vendor, admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Vendor product list' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findMyProducts", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get product by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Product detail' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR, user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update a product', description: 'Roles: vendor, admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated product' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_product_dto_1.UpdateProductDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR, user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Soft-delete a product', description: 'Roles: vendor, admin' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Deleted' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "remove", null);
__decorate([
    (0, common_1.Delete)(':id/hard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Permanently delete a product', description: 'Roles: admin' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Permanently deleted' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "hardDelete", null);
__decorate([
    (0, common_1.Post)(':productId/images'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR, user_role_enum_1.UserRole.ADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a product image', description: 'Roles: vendor, admin. Max 5MB. jpg/jpeg/png/webp.' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Image uploaded' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
            new common_1.FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
    }))),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, upload_product_image_dto_1.UploadProductImageDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Get)(':productId/images'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all images for a product' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Product images' }),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProductImages", null);
__decorate([
    (0, common_1.Patch)(':productId/images/:imageId/primary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR, user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Set an image as primary', description: 'Roles: vendor, admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Primary image updated' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Param)('imageId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "setPrimaryImage", null);
__decorate([
    (0, common_1.Patch)(':productId/images/:imageId/order'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR, user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update image display order', description: 'Roles: vendor, admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Order updated' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Param)('imageId')),
    __param(2, (0, common_1.Body)('displayOrder')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "updateImageOrder", null);
__decorate([
    (0, common_1.Patch)(':productId/images/reorder'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR, user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk reorder product images', description: 'Roles: vendor, admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Images reordered' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)('ordering')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "reorderImages", null);
__decorate([
    (0, common_1.Delete)(':productId/images/:imageId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.VENDOR, user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a product image', description: 'Roles: vendor, admin' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Image deleted' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Param)('imageId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "deleteImage", null);
exports.ProductsController = ProductsController = __decorate([
    (0, swagger_1.ApiTags)('Products'),
    (0, common_1.Controller)({
        path: 'products',
        version: '1',
    }),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        product_images_service_1.ProductImagesService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map