import { DataSource } from 'typeorm';
import { Category } from '../../products/entities/category.entity';
export declare function seedCategories(dataSource: DataSource): Promise<Category[]>;
