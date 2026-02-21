import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToClass } from 'class-transformer';
import {
  NOTIFICATION_EVENTS,
  UserRegisteredEvent,
} from '../notifications/events/notification-events';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    /**
     * EventEmitter2 is injected globally — no need to import EventEmitterModule here.
     *
     * KEY LEARNING: Why emit here and not in the controller?
     * =======================================================
     * Services own the business logic. The controller's job is just routing HTTP.
     * Emitting from the service means the event fires regardless of HOW create()
     * is called (HTTP, gRPC, CLI command, test, etc.) — not just from HTTP.
     */
    private readonly eventEmitter: EventEmitter2,
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

    /**
     * Emit AFTER save() returns — the user row is committed to the DB.
     *
     * KEY LEARNING: Event emission order
     * ====================================
     * If we emitted BEFORE save(), the welcome email job would be queued
     * for a user that might not exist yet (if save() fails after emit).
     * Always emit after the DB operation succeeds.
     *
     * The CommunicationEventsListener picks this up and queues a welcome email job.
     * This service doesn't know or care about email — it just fires the event.
     */
    const event: UserRegisteredEvent = {
      userId: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
    };
    this.eventEmitter.emit(NOTIFICATION_EVENTS.USER_REGISTERED, event);

    // Return user without password
    return plainToClass(UserResponseDto, savedUser, {
      excludeExtraneousValues: false,
    });
  }

  // Find user by email (for login)
  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['vendorProfile', 'customerProfile', 'riderProfile'], // Add this line
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
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
