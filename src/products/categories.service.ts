import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from '../common/utils/slug.util';

/**
 * Categories Service
 *
 * Contains all business logic for category management.
 * Follows the Repository Pattern (TypeORM provides the repository).
 *
 * Design Pattern: Service Layer Pattern
 * - Separates business logic from HTTP handling
 * - Reusable across different controllers
 * - Easier to test (mock repository)
 *
 * @Injectable() makes this available for dependency injection
 */
@Injectable()
export class CategoriesService {
  /**
   * Constructor Injection (Dependency Injection Pattern)
   *
   * @InjectRepository(Category) tells NestJS:
   * "Please inject the TypeORM repository for Category entity"
   *
   * Why DI?
   * - Loose coupling (easy to swap implementations)
   * - Testable (can inject mock repositories)
   * - NestJS manages lifecycle (singleton by default)
   */
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * Create a new category
   *
   * Business Logic:
   * 1. Validate parent exists (if parentId provided)
   * 2. Check for duplicate name
   * 3. Generate unique slug
   * 4. Save to database
   *
   * Why this order?
   * - Fail fast (check parent first, saves DB ops)
   * - Prevent duplicates before generating slug
   * - Slug generation is last (uses validated name)
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, parentId, ...rest } = createCategoryDto;

    // Step 1: Validate parent category exists (if provided)
    if (parentId) {
      const parentExists = await this.categoryRepository.findOne({
        where: { id: parentId, isActive: true },
      });

      if (!parentExists) {
        throw new NotFoundException(
          `Parent category with ID ${parentId} not found or inactive`,
        );
      }

      // Business Rule: Prevent more than 2 levels of nesting
      // Why? Deep hierarchies are confusing for users
      if (parentExists.parentId) {
        throw new BadRequestException(
          'Cannot create category more than 2 levels deep. Maximum depth: Root > Parent > Child',
        );
      }
    }

    // Step 2: Check for duplicate category name
    const existingCategory = await this.categoryRepository.findOne({
      where: { name },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Category with name "${name}" already exists`,
      );
    }

    // Step 3: Generate unique slug
    // slugify converts "Fast Food" -> "fast-food"
    // Options: { lower: true, strict: true } = lowercase, remove special chars
    const slug = await this.generateUniqueSlug(name);

    // Step 4: Create and save category
    const category = this.categoryRepository.create({
      name,
      slug,
      parentId,
      ...rest,
    });

    return await this.categoryRepository.save(category);
  }

  /**
   * Get all categories (hierarchical structure)
   *
   * Returns categories organized by parent-child relationships.
   * Only returns active categories by default.
   *
   * Query Strategy:
   * - Load all categories in one query (eager loading)
   * - TypeORM handles the parent/children relationships
   * - Filter by isActive in memory (already loaded)
   *
   * Why eager loading?
   * - Avoids N+1 query problem
   * - Single database round-trip
   * - Better performance for hierarchical data
   */
  async findAll(includeInactive = false): Promise<Category[]> {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.children', 'children')
      .orderBy('category.displayOrder', 'ASC')
      .addOrderBy('category.name', 'ASC');

    // Filter by active status if needed
    if (!includeInactive) {
      queryBuilder.where('category.isActive = :isActive', { isActive: true });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Get root categories (no parent)
   *
   * Useful for:
   * - Main navigation menu
   * - Category homepage
   * - First level of category browsing
   *
   * Query: WHERE parent_id IS NULL
   */
  async findRootCategories(): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: {
        parentId: IsNull(), // ✅ Fixed: Use IsNull() operator
        isActive: true,
      },
      relations: ['children'],
      order: {
        displayOrder: 'ASC',
        name: 'ASC',
      },
    });
  }

  /**
   * Get category by ID
   *
   * Loads:
   * - The category itself
   * - Its parent (if any)
   * - Its children (if any)
   *
   * Why load relationships?
   * - Often needed for display
   * - Cheaper to load once than multiple queries
   * - TypeORM handles it efficiently
   */
  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Get category by slug
   *
   * Used for SEO-friendly URLs:
   * /categories/fast-food/products
   *
   * Slug is unique, so safe to use for lookup
   */
  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug, isActive: true },
      relations: ['parent', 'children'],
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return category;
  }

  /**
   * Update category
   *
   * Business Logic:
   * 1. Verify category exists
   * 2. Validate new parent (if changing)
   * 3. Check for name conflicts
   * 4. Regenerate slug if name changed
   * 5. Save changes
   *
   * Why this complexity?
   * - Maintain data integrity
   * - Prevent circular references (A parent of B, B parent of A)
   * - Keep slugs in sync with names
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);
    const { name, parentId, ...rest } = updateCategoryDto;

    // Validate parent change
    if (parentId !== undefined) {
      // Prevent self-reference
      if (parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      // Prevent circular reference
      if (parentId) {
        const newParent = await this.categoryRepository.findOne({
          where: { id: parentId },
          relations: ['parent'],
        });

        if (!newParent) {
          throw new NotFoundException(`Parent category ${parentId} not found`);
        }

        // Check if new parent is actually a child of current category
        if (newParent.parentId === id) {
          throw new BadRequestException(
            'Cannot set a child category as parent (circular reference)',
          );
        }

        // Enforce 2-level max depth
        if (newParent.parentId) {
          throw new BadRequestException(
            'Cannot move category: would exceed maximum depth of 2 levels',
          );
        }
      }

      category.parentId = parentId;
    }

    // Update name and regenerate slug if name changed
    if (name && name !== category.name) {
      // Check for name conflict
      const existingCategory = await this.categoryRepository.findOne({
        where: { name },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException(
          `Category with name "${name}" already exists`,
        );
      }

      category.name = name;
      category.slug = await this.generateUniqueSlug(name, id);
    }

    // Update other fields
    Object.assign(category, rest);

    return await this.categoryRepository.save(category);
  }

  /**
   * Soft delete (deactivate) category
   *
   * Why soft delete?
   * - Preserve historical data
   * - Products still reference this category
   * - Can reactivate if needed
   *
   * What happens to children?
   * - They remain active
   * - They become "orphans" (root categories)
   * - Admin must manually reassign or deactivate
   */
  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    // Soft delete: just set isActive = false
    category.isActive = false;
    await this.categoryRepository.save(category);
  }

  /**
   * Hard delete category
   *
   * DANGEROUS: Only use for cleanup/testing
   * Production should use soft delete (remove method above)
   *
   * Why provide this?
   * - Admin might need to remove test/spam categories
   * - Should be protected with extra auth checks
   */
  async hardDelete(id: string): Promise<void> {
    const category = await this.findOne(id);

    // Check if category has children
    if (category.children && category.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with children. Delete or reassign children first.',
      );
    }

    await this.categoryRepository.remove(category);
  }

  /**
   * Generate unique slug from name
   *
   * Algorithm:
   * 1. Generate base slug from name
   * 2. Check if slug exists
   * 3. If exists, append number (slug-2, slug-3, etc.)
   * 4. Repeat until unique slug found
   *
   * Examples:
   * "Burgers" -> "burgers"
   * "Burgers" (duplicate) -> "burgers-2"
   * "Fast Food" -> "fast-food"
   *
   * @param name - Category name
   * @param excludeId - Don't check conflict with this ID (for updates)
   */
  private async generateUniqueSlug(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    // Generate base slug using our custom utility
    const slug = slugify(name);

    let uniqueSlug = slug;
    let counter = 1;

    // Keep trying until we find a unique slug
    while (true) {
      const existing = await this.categoryRepository.findOne({
        where: { slug: uniqueSlug },
      });

      // Slug is unique if:
      // - No existing category found, OR
      // - Existing category is the one we're updating
      if (!existing || existing.id === excludeId) {
        break;
      }

      // Slug exists, try with counter
      counter++;
      uniqueSlug = `${slug}-${counter}`;
    }

    return uniqueSlug;
  }
}
