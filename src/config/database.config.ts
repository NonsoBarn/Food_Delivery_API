import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'food_delivery_dev',
  entities: ['dist/**/*.entity{.ts,.js}'],
  /**
   * KEY LEARNING: synchronize + dropSchema in test environment
   * ===========================================================
   * synchronize: true — auto-creates/updates tables from entity definitions.
   *   Enabled for development (fast iteration) AND test (no migrations needed).
   *   NEVER enable in production — can silently DROP columns and corrupt data.
   *
   * dropSchema: true — wipes ALL tables and recreates them from entities
   *   on every app startup. Enabled ONLY in test so each e2e test run starts
   *   from a guaranteed blank slate. Without this, leftover rows from a previous
   *   run cause unique constraint violations on the next run (flaky tests).
   *
   *   Safe here because food_delivery_test is a throwaway database — its only
   *   purpose is to be overwritten by tests.
   */
  synchronize: ['development', 'test'].includes(process.env.NODE_ENV ?? ''),
  dropSchema: process.env.NODE_ENV === 'test',
  logging: process.env.NODE_ENV === 'development',
  migrations: ['dist/database/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}));
