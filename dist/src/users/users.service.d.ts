import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
export declare class UsersService {
    private readonly userRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(userRepository: Repository<User>, eventEmitter: EventEmitter2);
    create(createUserDto: CreateUserDto): Promise<UserResponseDto>;
    findByEmail(email: string): Promise<User>;
    findById(id: string): Promise<UserResponseDto>;
    validateUser(email: string, password: string): Promise<User | null>;
    findAll(): Promise<UserResponseDto[]>;
}
