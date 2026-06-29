import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
export declare function seedUsers(dataSource: DataSource): Promise<User[]>;
