import { AdminService } from './admin.service';
import { VendorActionDto } from './dto/vendor-action.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { VendorStatus } from '../users/entities/vendor-profile.entity';
import { User } from '../users/entities/user.entity';
import { CreateCategoryDto } from '../products/dto/create-category.dto';
import { UpdateCategoryDto } from '../products/dto/update-category.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getPlatformStats(): Promise<{
        message: string;
        data: object;
    }>;
    getVendors(status?: VendorStatus, page?: string, limit?: string): Promise<{
        vendors: import("../users/entities/vendor-profile.entity").VendorProfile[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        message: string;
    }>;
    getVendorById(id: string): Promise<{
        message: string;
        data: object;
    }>;
    updateVendorStatus(id: string, dto: VendorActionDto, admin: User): Promise<{
        message: string;
        data: import("../users/entities/vendor-profile.entity").VendorProfile;
    }>;
    getAllUsers(role?: UserRole, page?: string, limit?: string): Promise<{
        users: Partial<User>[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        message: string;
    }>;
    generateReport(query: ReportQueryDto): Promise<{
        message: string;
        data: object;
    }>;
    getAllCategories(): Promise<{
        message: string;
        data: import("../products/entities/category.entity").Category[];
    }>;
    createCategory(dto: CreateCategoryDto): Promise<{
        message: string;
        data: import("../products/entities/category.entity").Category;
    }>;
    updateCategory(id: string, dto: UpdateCategoryDto): Promise<{
        message: string;
        data: import("../products/entities/category.entity").Category;
    }>;
    deleteCategory(id: string): Promise<void>;
}
