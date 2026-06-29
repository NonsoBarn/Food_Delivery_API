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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const category_entity_1 = require("./entities/category.entity");
const slug_util_1 = require("../common/utils/slug.util");
let CategoriesService = class CategoriesService {
    categoryRepository;
    constructor(categoryRepository) {
        this.categoryRepository = categoryRepository;
    }
    async create(createCategoryDto) {
        const { name, parentId, ...rest } = createCategoryDto;
        if (parentId) {
            const parentExists = await this.categoryRepository.findOne({
                where: { id: parentId, isActive: true },
            });
            if (!parentExists) {
                throw new common_1.NotFoundException(`Parent category with ID ${parentId} not found or inactive`);
            }
            if (parentExists.parentId) {
                throw new common_1.BadRequestException('Cannot create category more than 2 levels deep. Maximum depth: Root > Parent > Child');
            }
        }
        const existingCategory = await this.categoryRepository.findOne({
            where: { name },
        });
        if (existingCategory) {
            throw new common_1.ConflictException(`Category with name "${name}" already exists`);
        }
        const slug = await this.generateUniqueSlug(name);
        const category = this.categoryRepository.create({
            name,
            slug,
            parentId,
            ...rest,
        });
        return await this.categoryRepository.save(category);
    }
    async findAll(includeInactive = false) {
        const queryBuilder = this.categoryRepository
            .createQueryBuilder('category')
            .leftJoinAndSelect('category.parent', 'parent')
            .leftJoinAndSelect('category.children', 'children')
            .orderBy('category.displayOrder', 'ASC')
            .addOrderBy('category.name', 'ASC');
        if (!includeInactive) {
            queryBuilder.where('category.isActive = :isActive', { isActive: true });
        }
        return await queryBuilder.getMany();
    }
    async findRootCategories() {
        return await this.categoryRepository.find({
            where: {
                parentId: (0, typeorm_2.IsNull)(),
                isActive: true,
            },
            relations: ['children'],
            order: {
                displayOrder: 'ASC',
                name: 'ASC',
            },
        });
    }
    async findOne(id) {
        const category = await this.categoryRepository.findOne({
            where: { id },
            relations: ['parent', 'children'],
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID ${id} not found`);
        }
        return category;
    }
    async findBySlug(slug) {
        const category = await this.categoryRepository.findOne({
            where: { slug, isActive: true },
            relations: ['parent', 'children'],
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category with slug "${slug}" not found`);
        }
        return category;
    }
    async update(id, updateCategoryDto) {
        const category = await this.findOne(id);
        const { name, parentId, ...rest } = updateCategoryDto;
        if (parentId !== undefined) {
            if (parentId === id) {
                throw new common_1.BadRequestException('Category cannot be its own parent');
            }
            if (parentId) {
                const newParent = await this.categoryRepository.findOne({
                    where: { id: parentId },
                    relations: ['parent'],
                });
                if (!newParent) {
                    throw new common_1.NotFoundException(`Parent category ${parentId} not found`);
                }
                if (newParent.parentId === id) {
                    throw new common_1.BadRequestException('Cannot set a child category as parent (circular reference)');
                }
                if (newParent.parentId) {
                    throw new common_1.BadRequestException('Cannot move category: would exceed maximum depth of 2 levels');
                }
            }
            category.parentId = parentId;
        }
        if (name && name !== category.name) {
            const existingCategory = await this.categoryRepository.findOne({
                where: { name },
            });
            if (existingCategory && existingCategory.id !== id) {
                throw new common_1.ConflictException(`Category with name "${name}" already exists`);
            }
            category.name = name;
            category.slug = await this.generateUniqueSlug(name, id);
        }
        Object.assign(category, rest);
        return await this.categoryRepository.save(category);
    }
    async remove(id) {
        const category = await this.findOne(id);
        category.isActive = false;
        await this.categoryRepository.save(category);
    }
    async hardDelete(id) {
        const category = await this.findOne(id);
        if (category.children && category.children.length > 0) {
            throw new common_1.BadRequestException('Cannot delete category with children. Delete or reassign children first.');
        }
        await this.categoryRepository.remove(category);
    }
    async generateUniqueSlug(name, excludeId) {
        const slug = (0, slug_util_1.slugify)(name);
        let uniqueSlug = slug;
        let counter = 1;
        while (true) {
            const existing = await this.categoryRepository.findOne({
                where: { slug: uniqueSlug },
            });
            if (!existing || existing.id === excludeId) {
                break;
            }
            counter++;
            uniqueSlug = `${slug}-${counter}`;
        }
        return uniqueSlug;
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map