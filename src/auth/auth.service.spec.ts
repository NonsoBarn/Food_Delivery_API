/**
 * AuthService Unit Tests
 *
 * KEY LEARNING: What makes a good unit test?
 * ==========================================
 * A unit test exercises ONE class in complete isolation.
 * Every dependency is replaced with a "mock" — a fake object
 * that returns predictable values.
 *
 * The test structure follows AAA:
 *   Arrange — set up mocks and inputs
 *   Act     — call the method under test
 *   Assert  — verify the output or thrown error
 *
 * KEY LEARNING: jest.fn() — the core mocking primitive
 * =====================================================
 * jest.fn() creates a function that:
 * - Records every call (arguments, return value, call count)
 * - Returns undefined by default
 * - Can be configured: .mockResolvedValue(x) → returns Promise.resolve(x)
 *                      .mockRejectedValue(e) → returns Promise.reject(e)
 *                      .mockReturnValue(x)   → returns x synchronously
 *                      .mockImplementation(fn) → runs fn when called
 *
 * KEY LEARNING: clearAllMocks in beforeEach
 * ==========================================
 * jest.clearAllMocks() resets call counts and return values between tests.
 * Without it, a previous test's .mockResolvedValue() bleeds into the next
 * test — the mock still returns the old value and the test passes for
 * the wrong reason ("test pollution").
 */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

// ─── Test fixtures ───────────────────────────────────────────────────────────

/**
 * A minimal User object for testing.
 * We use Object.assign to create a plain object that satisfies the User type
 * without instantiating the full TypeORM entity (which would pull in DB metadata).
 */
function makeUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: 'user-uuid-123',
    email: 'test@example.com',
    role: UserRole.CUSTOMER,
    password: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

// ─── Mock dependencies ────────────────────────────────────────────────────────

/**
 * KEY LEARNING: Mock objects as simple POJOs
 * ===========================================
 * We don't import/use the real UsersService class — just provide an object
 * with the same method names. NestJS injects it by token (the class reference),
 * so { provide: UsersService, useValue: mockUsersService } swaps in our fake.
 *
 * Only include methods that AuthService actually calls.
 * Extra methods would be ignored anyway, but keeping mocks minimal
 * makes the test's intent clear.
 */
const mockUsersService = {
  validateUser: jest.fn(),
  findByEmail: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

/**
 * ConfigService.get() is called with string keys like 'jwt.secret'.
 * We return a sensible test value for any key.
 */
const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret-value'),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    /**
     * KEY LEARNING: Test.createTestingModule()
     * =========================================
     * This is @nestjs/testing's main entry point.
     * It creates a mini NestJS DI container — just enough to resolve
     * AuthService and inject its dependencies.
     *
     * providers: [...] is equivalent to a module's providers array.
     * We list AuthService (real) and all its dependencies (mocked).
     */
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset all mock state before each test to prevent test pollution
    jest.clearAllMocks();

    // Default: signAsync returns a mock token string
    mockJwtService.signAsync.mockResolvedValue('mock.jwt.token');
  });

  // ─── login() ───────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('should return tokens and user data on valid credentials', async () => {
      // Arrange
      const user = makeUser();
      mockUsersService.validateUser.mockResolvedValue(user);

      // Act
      const result = await service.login({
        email: 'test@example.com',
        password: 'correct_password',
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'mock.jwt.token',
          refreshToken: 'mock.jwt.token',
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
        }),
      );

      // Verify the right credentials were passed to validateUser
      expect(mockUsersService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'correct_password',
      );
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      // Arrange — validateUser returns null when credentials are wrong
      mockUsersService.validateUser.mockResolvedValue(null);

      // Act & Assert
      /**
       * KEY LEARNING: Testing async errors with rejects.toThrow()
       * ===========================================================
       * For async methods, use expect(asyncFn()).rejects.toThrow().
       * For sync methods, use expect(() => syncFn()).toThrow().
       *
       * We check both the exception TYPE and the MESSAGE to ensure
       * we're catching the right error (not a different UnauthorizedException
       * from somewhere else in the call stack).
       */
      await expect(
        service.login({ email: 'test@example.com', password: 'wrong_password' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('should call jwtService.signAsync twice to generate access and refresh tokens', async () => {
      // Arrange
      mockUsersService.validateUser.mockResolvedValue(makeUser());

      // Act
      await service.login({ email: 'test@example.com', password: 'correct_password' });

      /**
       * KEY LEARNING: toHaveBeenCalledTimes()
       * =======================================
       * AuthService.generateTokens() calls signAsync twice in parallel
       * (Promise.all). We verify both tokens are requested — if someone
       * accidentally removes the refresh token call, this test catches it.
       */
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should include the correct JWT payload (sub, email, role)', async () => {
      // Arrange
      const user = makeUser({ id: 'specific-id', email: 'vendor@test.com', role: UserRole.VENDOR });
      mockUsersService.validateUser.mockResolvedValue(user);

      // Act
      await service.login({ email: 'vendor@test.com', password: 'pw' });

      // Assert — first call is the access token
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'specific-id', email: 'vendor@test.com', role: UserRole.VENDOR },
        expect.objectContaining({ secret: 'test-secret-value' }),
      );
    });
  });

  // ─── refreshTokens() ───────────────────────────────────────────────────────

  describe('refreshTokens()', () => {
    it('should return new tokens when refresh token is valid', async () => {
      // Arrange
      const user = makeUser();
      // verify() parses the token and returns the payload
      mockJwtService.verify.mockReturnValue({ sub: user.id, email: user.email, role: user.role });
      mockUsersService.findByEmail.mockResolvedValue(user);

      // Act
      const result = await service.refreshTokens('valid.refresh.token');

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        }),
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(user.email);
    });

    it('should throw UnauthorizedException when refresh token is expired or invalid', async () => {
      /**
       * KEY LEARNING: Simulating thrown errors in mocks
       * =================================================
       * jwtService.verify() throws when the token is expired/invalid.
       * We simulate this with .mockImplementation(() => { throw new Error(...) }).
       * The AuthService's try/catch catches it and re-throws as
       * UnauthorizedException('Invalid or expired refresh token').
       */
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refreshTokens('expired.token')).rejects.toThrow(
        new UnauthorizedException('Invalid or expired refresh token'),
      );
    });

    it('should throw UnauthorizedException when user is not found after token verification', async () => {
      // Valid token but user was deleted from DB
      mockJwtService.verify.mockReturnValue({ email: 'ghost@test.com' });
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.refreshTokens('valid.but.orphaned.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── validateUserById() ────────────────────────────────────────────────────

  describe('validateUserById()', () => {
    it('should return the user when found', async () => {
      const user = makeUser();
      mockUsersService.findByEmail.mockResolvedValue(user);

      const result = await service.validateUserById(user.id);

      expect(result).toBe(user);
    });

    it('should propagate the error when findByEmail throws (user not found)', async () => {
      /**
       * KEY LEARNING: Test what the code actually does, not what you assume
       * ====================================================================
       * validateUserById() calls findByEmail() then checks if(!user).
       * But findByEmail() throws NotFoundException when not found — it doesn't
       * return null. So the if(!user) check never runs.
       *
       * The error propagates to the JWT strategy's validate() method, which
       * handles it. validateUserById() itself is a thin wrapper.
       *
       * This test documents the actual behaviour: the error propagates.
       */
      mockUsersService.findByEmail.mockRejectedValue(new Error('Not found'));

      await expect(service.validateUserById('nonexistent-id')).rejects.toThrow(Error);
    });
  });
});
