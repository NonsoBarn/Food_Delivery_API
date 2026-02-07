import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Module
 *
 * Provides Redis client as a global module.
 * Used for caching, cart storage, and session management.
 *
 * @Global decorator makes this available everywhere without importing
 *
 * Why Redis?
 * - In-memory storage (extremely fast)
 * - TTL support (automatic expiration)
 * - Atomic operations (HINCRBY, INCR, etc.)
 * - Pub/Sub for real-time features
 * - Scalable (handles millions of ops/sec)
 *
 * Use Cases:
 * - Shopping cart storage
 * - Session management
 * - Rate limiting
 * - Caching (product lists, category data)
 * - Real-time notifications (pub/sub)
 */
@Global()
@Module({
  imports: [ConfigModule], // Import ConfigModule to use ConfigService
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redis = new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),

          retryStrategy: (times: number) => {
            if (times > 10) {
              // Give up after 10 attempts
              console.error('Redis connection failed after 10 retries');
              return null;
            }
            // Retry immediately for first 10 attempts
            return Math.min(times * 100, 2000);
          },

          /**
           * Enable offline queue
           *
           * Commands sent while disconnected are queued and
           * executed when connection restored.
           *
           * Why enable?
           * - Prevents command loss during brief disconnections
           * - Transparent recovery for application
           */
          enableOfflineQueue: true,

          /**
           * Lazy connect
           *
           * Don't connect immediately on creation.
           * Connect on first command.
           *
           * Why?
           * - Faster application startup
           * - Redis might not be ready yet (Docker startup order)
           */
          lazyConnect: false,
        });

        /**
         * Event Listeners for monitoring
         */
        redis.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

        redis.on('error', (error) => {
          console.error('❌ Redis connection error:', error);
        });

        redis.on('close', () => {
          console.log('⚠️  Redis connection closed');
        });

        redis.on('reconnecting', () => {
          console.log('🔄 Redis reconnecting...');
        });

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
