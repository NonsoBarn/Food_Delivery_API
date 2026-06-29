import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { VendorProfile, VendorStatus } from '../users/entities/vendor-profile.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { CategoriesService } from '../products/categories.service';
import { UserRole } from '../common/enums/user-role.enum';
import { VendorActionDto } from './dto/vendor-action.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { CreateCategoryDto } from '../products/dto/create-category.dto';
import { UpdateCategoryDto } from '../products/dto/update-category.dto';
export declare class AdminService {
    private readonly userRepo;
    private readonly vendorProfileRepo;
    private readonly orderRepo;
    private readonly productRepo;
    private readonly categoriesService;
    private readonly logger;
    constructor(userRepo: Repository<User>, vendorProfileRepo: Repository<VendorProfile>, orderRepo: Repository<Order>, productRepo: Repository<Product>, categoriesService: CategoriesService);
    getPlatformStats(): Promise<object>;
    getVendors(status?: VendorStatus, page?: number, limit?: number): Promise<{
        vendors: VendorProfile[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getVendorById(id: string): Promise<object>;
    updateVendorStatus(id: string, dto: VendorActionDto, adminUserId: string): Promise<VendorProfile>;
    getAllUsers(role?: UserRole, page?: number, limit?: number): Promise<{
        users: Partial<User>[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    generateReport(query: ReportQueryDto): Promise<object>;
    getAllCategories(): Promise<import("../products/entities/category.entity").Category[]>;
    createCategory(dto: CreateCategoryDto): Promise<import("../products/entities/category.entity").Category>;
    updateCategory(id: string, dto: UpdateCategoryDto): Promise<import("../products/entities/category.entity").Category>;
    deleteCategory(id: string): Promise<void>;
    private buildDateRange;
}
