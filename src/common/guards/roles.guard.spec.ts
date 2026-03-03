/**
 * RolesGuard Unit Tests
 *
 * KEY LEARNING: How to test NestJS Guards
 * ========================================
 * Guards implement CanActivate and receive an ExecutionContext.
 * The context is NestJS's abstraction over the underlying transport
 * (HTTP, WebSocket, gRPC). For HTTP, it wraps the Express Request object.
 *
 * To test a guard without starting an HTTP server:
 * 1. Create a fake ExecutionContext with jest.fn() for each method
 * 2. Provide the request object with the user already attached
 *    (JwtAuthGuard sets req.user — RolesGuard reads it)
 * 3. Mock Reflector to return the @Roles() metadata we want to test
 * 4. Call guard.canActivate(context) directly
 *
 * KEY LEARNING: Why guards are worth testing separately
 * =====================================================
 * Guards sit at the perimeter of your application — they're the first
 * line of defense after JWT verification. A bug here means wrong roles
 * can access protected resources. Unit tests make the role logic explicit
 * and catch regressions without needing full HTTP round-trips.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates a fake ExecutionContext that returns `userRole` from req.user.
 *
 * KEY LEARNING: `as unknown as ExecutionContext`
 * ===============================================
 * ExecutionContext is an interface with many methods. Our fake object only
 * implements the methods RolesGuard actually calls. TypeScript would reject
 * a partial object, so we use `as unknown as ExecutionContext` to assert
 * the type. This is a common and accepted pattern in testing — we're saying
 * "trust me, this object satisfies the interface for our purposes."
 */
function buildContext(userRole: UserRole | null): ExecutionContext {
  return {
    getHandler: jest.fn().mockReturnValue({}),
    getClass: jest.fn().mockReturnValue({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole !== null ? { role: userRole } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      /**
       * KEY LEARNING: Providing the real Reflector
       * =============================================
       * Reflector is a lightweight NestJS utility class that reads metadata
       * set by decorators like @Roles(). We use the real class here (not a mock)
       * but we spy on its method to control what it returns.
       *
       * Alternative: mock Reflector entirely with useValue.
       * Using the real class + spy is more faithful to production behaviour.
       */
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow access when no @Roles() decorator is present on the route', () => {
    /**
     * If no roles are required, the guard returns true (open route).
     * Example: GET /products (public browsing).
     */
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = buildContext(UserRole.CUSTOMER);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when the user has exactly the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = buildContext(UserRole.ADMIN);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when the user role does not match', () => {
    /**
     * CUSTOMER tries to access an ADMIN-only route.
     * The guard must throw ForbiddenException (HTTP 403), not return false.
     * Throwing gives a more informative error message than a silent denial.
     */
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = buildContext(UserRole.CUSTOMER);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access when the user has one of multiple allowed roles', () => {
    /**
     * Some routes allow both ADMIN and VENDOR.
     * If the user is VENDOR, they should pass.
     */
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      UserRole.ADMIN,
      UserRole.VENDOR,
    ]);
    const context = buildContext(UserRole.VENDOR);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException with the required roles listed in the message', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = buildContext(UserRole.RIDER);

    /**
     * KEY LEARNING: Testing error message content
     * ============================================
     * We don't just check THAT an exception is thrown — we check WHAT it says.
     * This ensures the error message is informative ("Required roles: admin")
     * rather than a generic "Access denied" with no actionable info.
     */
    expect(() => guard.canActivate(context)).toThrow(
      expect.objectContaining({ message: expect.stringContaining('admin') }),
    );
  });

  it('should check reflector with both handler and class contexts', () => {
    /**
     * @Roles() can be placed on the controller class OR on a specific method.
     * getAllAndOverride checks BOTH (method takes precedence over class).
     * We verify it's called with ROLES_KEY and the handler + class.
     */
    const getAllAndOverrideSpy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN]);
    const handler = {};
    const cls = {};
    const context = {
      getHandler: jest.fn().mockReturnValue(handler),
      getClass: jest.fn().mockReturnValue(cls),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: UserRole.ADMIN } }) }),
    } as unknown as ExecutionContext;

    guard.canActivate(context);

    expect(getAllAndOverrideSpy).toHaveBeenCalledWith(ROLES_KEY, [handler, cls]);
  });
});
