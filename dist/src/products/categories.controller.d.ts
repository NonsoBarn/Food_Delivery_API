import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    create(createCategoryDto: CreateCategoryDto): Promise<import("./entities/category.entity").Category>;
    findAll(includeInactive?: boolean): Promise<import("./entities/category.entity").Category[]>;
    findRootCategories(): Promise<import("./entities/category.entity").Category[]>;
    findBySlug(slug: string): Promise<import("./entities/category.entity").Category>;
    findOne(id: string): Promise<import("./entities/category.entity").Category>;
    update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<import("./entities/category.entity").Category>;
    remove(id: string): Promise<void>;
    hardDelete(id: string): Promise<void>;
}
