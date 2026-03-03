/**
 * Auth E2E Tests
 *
 * KEY LEARNING: E2E tests vs Unit tests
 * ======================================
 * Unit tests: test ONE class in isolation, mock all dependencies.
 *   Fast. No external services. Tests business logic correctness.
 *
 * E2E tests: test the FULL request-response cycle.
 *   Slow. Requires real database + Redis. Tests the ENTIRE stack:
 *   HTTP routing → guards → controller → service → TypeORM → PostgreSQL → response.
 *
 * E2E tests catch bugs that unit tests can't:
 *   - Missing @UseGuards() on a route (guard not applied)
 *   - Wrong HTTP method on a route
 *   - Validation pipe not stripping unknown fields
 *   - Database constraint violation (unique email)
 *   - Missing relations in a TypeORM query
 *
 * KEY LEARNING: beforeAll vs beforeEach
 * ======================================
 * beforeAll: runs ONCE before all tests in the describe block.
 *   Use for expensive setup (creating the app, DB connection).
 *
 * beforeEach: runs before EVERY test.
 *   Use for cheap, test-specific setup (resetting mock values).
 *
 * For E2E, we create the app once (beforeAll) because spinning up NestJS
 * takes ~5 seconds. Doing it before each test would make the suite 10x slower.
 *
 * KEY LEARNING: Supertest
 * ========================
 * `request(app.getHttpServer())` wraps the NestJS HTTP server.
 * It sends real HTTP requests without opening a network port.
 * `.post(url).send(body).expect(status)` is the core API.
 * `.expect(status)` throws if the actual status doesn't match.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  /**
   * Create the NestJS application ONCE for all tests in this file.
   * The test database (food_delivery_test) is wiped and recreated on init
   * because database.config.ts sets dropSchema: true for NODE_ENV=test.
   */
  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Registration ───────────────────────────────────────────────────────────

  describe('POST /api/v1/users/register', () => {
    const newUser = {
      email: 'newcustomer@test.com',
      password: 'SecurePass123!',
      role: 'customer',
    };

    it('should register a new user and return 201 with user data (no password)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .send(newUser)
        .expect(201);

      expect(res.body).toMatchObject({ email: newUser.email, role: newUser.role });
      /**
       * KEY LEARNING: Asserting security properties
       * =============================================
       * The password must NEVER appear in the response body.
       * We check this explicitly — not just "the response looks right"
       * but "the response is safe." This kind of security assertion
       * is a prime example of why E2E tests are valuable.
       */
      expect(res.body).not.toHaveProperty('password');
      expect(res.body.id).toBeDefined();
    });

    it('should return 409 when email is already registered', async () => {
      // Try to register the same email again
      await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .send(newUser)
        .expect(409);
    });

    it('should return 400 when email format is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .send({ email: 'not-an-email', password: 'ValidPass1!', role: 'customer' })
        .expect(400);

      /**
       * KEY LEARNING: ValidationPipe in E2E tests
       * ==========================================
       * This test ONLY works if createTestApp() applies the same ValidationPipe
       * as main.ts. Without it, the invalid email would be accepted.
       * This is why mirroring main.ts is essential.
       */
      expect(res.body.message).toBeDefined();
    });

    it('should return 400 when password is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .send({ email: 'valid@test.com', role: 'customer' })
        .expect(400);
    });
  });

  // ─── Login ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    /**
     * We register a user here first, then use those credentials for login tests.
     * Tests in the same describe block share the `loginUser` variable.
     */
    const loginUser = {
      email: 'logintest@test.com',
      password: 'LoginPass123!',
    };

    beforeAll(async () => {
      // Register the user we'll use for login tests
      await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .send({ ...loginUser, role: 'customer' });
    });

    it('should return 200 with accessToken and refreshToken on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginUser)
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user).toMatchObject({ email: loginUser.email, role: 'customer' });
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return 401 when password is wrong', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: loginUser.email, password: 'WrongPassword1!' })
        .expect(401);
    });

    it('should return 401 when email does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'SomePass1!' })
        .expect(401);
    });
  });

  // ─── Token Refresh ──────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // Register then login to get a refresh token
      await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .send({ email: 'refresh@test.com', password: 'RefreshPass1!', role: 'customer' });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'refresh@test.com', password: 'RefreshPass1!' });

      refreshToken = loginRes.body.refreshToken;
    });

    it('should return new tokens when a valid refresh token is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should return 401 when refresh token is invalid or tampered', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'this.is.garbage' })
        .expect(401);
    });

    it('should return 400 when refreshToken field is missing from the body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  // ─── Protected Routes ───────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me (protected route)', () => {
    let accessToken: string;

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .send({ email: 'metest@test.com', password: 'MePass1234!', role: 'customer' });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'metest@test.com', password: 'MePass1234!' });

      accessToken = loginRes.body.accessToken;
    });

    it('should return 200 with the current user when a valid token is provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        /**
         * KEY LEARNING: Passing JWT in Authorization header
         * ==================================================
         * E2E tests pass the JWT as "Bearer <token>" in the Authorization header.
         * JwtAuthGuard reads this header and validates the token.
         * If it's valid, req.user is populated with the decoded payload.
         */
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe('metest@test.com');
    });

    it('should return 401 when no Authorization header is provided', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return 401 when an invalid token is provided', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });
});
