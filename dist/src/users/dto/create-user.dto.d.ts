import { UserRole } from 'src/common/enums/user-role.enum';
export declare class CreateUserDto {
    email: string;
    password: string;
    role?: UserRole;
}
