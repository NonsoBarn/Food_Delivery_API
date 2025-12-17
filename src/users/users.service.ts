import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Register new user
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Attempting to create user: ${createUserDto.email}`);

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      this.logger.warn(`User already exists: ${createUserDto.email}`);
      throw new ConflictException('Email already registered');
    }

    // Create new user
    const user = this.userRepository.create(createUserDto);

    // Save user (password will be hashed automatically by @BeforeInsert)
    const savedUser = await this.userRepository.save(user);

    this.logger.log(`User created successfully: ${savedUser.id}`);

    // Return user without password
    return plainToClass(UserResponseDto, savedUser, {
      excludeExtraneousValues: false,
    });
  }

  // Find user by email (for login)
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  // Find user by ID
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return plainToClass(UserResponseDto, user, {
      excludeExtraneousValues: false,
    });
  }

  // Validate user credentials (for login)
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  // Get all users (admin only - we'll add auth later)
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find();

    return users.map((user) =>
      plainToClass(UserResponseDto, user, {
        excludeExtraneousValues: false,
      }),
    );
  }
}
