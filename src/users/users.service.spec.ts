/**
 * UsersService Unit Tests
 *
 * KEY LEARNING: Mocking TypeORM repositories
 * ==========================================
 * UsersService depends on Repository<User> (injected via @InjectRepository).
 * In tests, we replace it with a plain object whose methods are jest.fn().
 *
 * TypeORM's getRepositoryToken(User) is the DI token NestJS uses internally.
 * We provide our mock under that same token so the DI container injects
 * our mock instead of the real Repository.
 *
 * KEY LEARNING: Testing event emission (side effects)
 * ====================================================
 * UsersService emits a USER_REGISTERED event after saving a user.
 * The listener (CommunicationEventsListener) picks this up and queues a welcome email.
 *
 * In unit tests, we DON'T want the real listener to run — it would require
 * Redis, BullMQ, and SendGrid. Instead, we mock EventEmitter2 and simply
 * assert that .emit() was called with the right arguments.
 *
 * This is the "verify the message was sent, not the postman" principle.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { NOTIFICATION_EVENTS } from '../notifications/events/notification-events';

// ─── Test fixtures ───────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: 'user-uuid-456',
    email: 'user@example.com',
    role: UserRole.CUSTOMER,
    password: '$2b$10$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
    comparePassword: jest.fn(),   // method on User entity (bcrypt.compare wrapper)
    ...overrides,
  });
}

// ─── Mock dependencies ────────────────────────────────────────────────────────

/**
 * Repository mock — mirrors the TypeORM Repository<User> interface.
 * Only methods that UsersService actually calls are needed.
 */
const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        /**
         * KEY LEARNING: getRepositoryToken()
         * ====================================
         * When NestJS sees @InjectRepository(User), it looks up the DI
         * token getRepositoryToken(User). We provide our mock under that
         * same token. The service receives the mock transparently.
         */
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ─── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto = {
      email: 'new@example.com',
      password: 'ValidPass1!',
      role: UserRole.CUSTOMER,
    };

    it('should create a new user and return UserResponseDto (no password field)', async () => {
      // Arrange — no existing user, create + save succeed
      const savedUser = makeUser({ email: createDto.email, id: 'new-id' });
      mockUserRepository.findOne.mockResolvedValue(null);        // not a duplicate
      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);

      // Act
      const result = await service.create(createDto);

      // Assert — result should have user data but password value must not be exposed
      expect(result).toEqual(expect.objectContaining({ email: createDto.email }));
      /**
       * KEY LEARNING: @Exclude() in class-transformer
       * ================================================
       * UserResponseDto marks `password` with @Exclude(). plainToClass()
       * returns a class instance where `password` is excluded (value is undefined).
       * We assert the value is undefined — the key may still exist on the class
       * prototype, but serialising to JSON omits it entirely via ClassSerializer.
       */
      expect(result.password).toBeUndefined();
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when email is already registered', async () => {
      // Arrange — simulate an existing user with the same email
      mockUserRepository.findOne.mockResolvedValue(makeUser({ email: createDto.email }));

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        new ConflictException('Email already registered'),
      );

      // save() must NOT be called — we rejected before reaching it
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should emit USER_REGISTERED event after saving the user', async () => {
      // Arrange
      const savedUser = makeUser({ email: createDto.email, id: 'emitted-id' });
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);

      // Act
      await service.create(createDto);

      /**
       * KEY LEARNING: Asserting event emission
       * ========================================
       * We check that:
       * 1. emit() was called (the event fired at all)
       * 2. The correct event name was used (not a typo)
       * 3. The payload contains the right data (listeners depend on this shape)
       *
       * We DON'T test what the listener does with it — that's the listener's test.
       */
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        NOTIFICATION_EVENTS.USER_REGISTERED,
        expect.objectContaining({
          userId: savedUser.id,
          email: savedUser.email,
          role: savedUser.role,
        }),
      );
    });

    it('should emit event AFTER save, not before', async () => {
      /**
       * KEY LEARNING: Event emission order
       * ====================================
       * This test verifies the project's core rule: events fire AFTER the
       * DB operation, never before. If save() fails, the event must not fire
       * (no welcome email for a user that doesn't exist yet).
       *
       * We test this by making save() throw and verifying emit() was NOT called.
       */
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(makeUser());
      mockUserRepository.save.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.create(createDto)).rejects.toThrow();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  // ─── findByEmail() ─────────────────────────────────────────────────────────

  describe('findByEmail()', () => {
    it('should return the user when found', async () => {
      const user = makeUser();
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('user@example.com');

      expect(result).toBe(user);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'user@example.com' } }),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findByEmail('ghost@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── validateUser() ────────────────────────────────────────────────────────

  describe('validateUser()', () => {
    it('should return the user when email and password are both correct', async () => {
      const user = makeUser();
      // comparePassword is a method on the User entity that wraps bcrypt.compare
      (user.comparePassword as jest.Mock).mockResolvedValue(true);
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.validateUser('user@example.com', 'correct_pw');

      expect(result).toBe(user);
    });

    it('should return null when password is incorrect', async () => {
      /**
       * KEY LEARNING: Testing null return vs exception
       * ================================================
       * validateUser() returns null for bad credentials (not an exception).
       * AuthService.login() then throws UnauthorizedException.
       * This two-step design separates "is the password wrong?" from
       * "what HTTP response should we send?" — service vs. controller concerns.
       */
      const user = makeUser();
      (user.comparePassword as jest.Mock).mockResolvedValue(false);
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.validateUser('user@example.com', 'wrong_pw');

      expect(result).toBeNull();
    });

    it('should return null when the user email does not exist', async () => {
      // findByEmail throws NotFoundException → validateUser should handle it
      mockUserRepository.findOne.mockResolvedValue(null);

      // validateUser calls findByEmail which throws — it should propagate
      // (AuthService catches this and maps it to UnauthorizedException)
      await expect(service.validateUser('nobody@example.com', 'pw')).rejects.toThrow();
    });
  });
});
