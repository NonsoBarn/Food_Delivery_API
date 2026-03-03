/**
 * createTestApp — Shared E2E Test Application Factory
 *
 * KEY LEARNING: Why a shared test app factory?
 * ============================================
 * Every e2e test file needs a running NestJS app. Without this helper,
 * each test file would duplicate the same setup. Worse, if the setup
 * diverges from main.ts (e.g. missing ValidationPipe), tests pass with
 * invalid input that production rejects — false confidence.
 *
 * This factory is the single source of truth for test app configuration.
 * When main.ts changes (new middleware, new pipe config), update this too.
 *
 * KEY LEARNING: How test DB config works
 * =======================================
 * The test:e2e script sets NODE_ENV=test before running Jest.
 * NestJS ConfigModule loads .env.test (because NODE_ENV=test).
 * database.config.ts reads DB_NAME from .env.test → food_delivery_test.
 * database.config.ts also sets:
 *   - synchronize: true  (because NODE_ENV=test)
 *   - dropSchema: true   (because NODE_ENV=test)
 *
 * Result: every e2e run wipes and recreates the test DB schema automatically.
 * No manual migration, no stale data, no flaky tests from previous runs.
 *
 * KEY LEARNING: What we skip vs main.ts
 * =======================================
 * main.ts sets up SocketIoAdapter (WebSocket + Redis pub/sub).
 * We skip it here — the HTTP endpoints (what e2e tests cover) work without it.
 * Global filters/interceptors (AllExceptionsFilter, LoggingInterceptor) are
 * registered via APP_FILTER / APP_INTERCEPTOR in AppModule, so they apply
 * automatically — no manual registration needed in tests.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication({ rawBody: true });

  /**
   * Mirror main.ts configuration exactly.
   *
   * ValidationPipe and versioning are app-level settings (not DI-registered),
   * so we must apply them here manually. Missing either one causes silent
   * divergence between tests and production:
   *
   * - No ValidationPipe → DTO validation skipped → tests accept bad input
   * - No versioning     → routes are /auth/login instead of /api/v1/auth/login
   */
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // strip unknown properties
      forbidNonWhitelisted: true,   // throw on unknown properties
      transform: true,              // auto-transform payload to DTO class
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();
  return app;
}
