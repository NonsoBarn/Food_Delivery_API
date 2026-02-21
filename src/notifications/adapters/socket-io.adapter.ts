/**
 * SocketIoAdapter
 *
 * A custom Socket.io adapter that adds two features on top of NestJS's default:
 * 1. CORS configuration from environment variables
 * 2. Redis pub/sub for horizontal scaling
 *
 * KEY LEARNING: What is an Adapter?
 * ====================================
 * NestJS uses the Adapter pattern to decouple the framework from the
 * transport layer. The default adapter uses Socket.io with no Redis.
 * By providing our own adapter, we can customize how Socket.io is configured
 * without changing any gateway code.
 *
 * Analogy: A power adapter lets you plug a US device into a EU socket.
 * Our adapter lets NestJS gateways work with Redis-backed Socket.io.
 *
 * KEY LEARNING: Why Two Redis Connections?
 * =========================================
 * Redis pub/sub uses a dedicated connection model:
 * - A connection in SUBSCRIBE mode can ONLY receive — it can't do other commands
 * - A connection in PUBLISH mode can send events to channels
 *
 * If you tried to use one connection for both, Redis would throw an error
 * after you subscribe because the connection is "locked" into subscribe mode.
 *
 * So: pubClient = dedicated publisher, subClient = dedicated subscriber.
 * The @socket.io/redis-adapter handles routing events between these two.
 *
 * KEY LEARNING: Why Redis Pub/Sub for WebSockets?
 * =================================================
 * Imagine you run 3 Node.js server instances (for load balancing):
 *
 * Server 1: holds Rider A's WebSocket connection
 * Server 2: holds Customer B's WebSocket connection
 * Server 3: holds Vendor C's WebSocket connection
 *
 * Without Redis: When an order is created on Server 3, it can't reach
 * Rider A (on Server 1) or Customer B (on Server 2). They're in different
 * in-memory socket.io instances.
 *
 * With Redis adapter: Server 3 publishes to Redis, Redis forwards to all
 * servers, Server 1 delivers to Rider A, Server 2 delivers to Customer B.
 * All instances share one virtual "room" namespace via Redis.
 *
 * Even with a single server, Redis pub/sub is good practice — it prepares
 * your app for horizontal scaling without code changes later.
 */

import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { ServerOptions } from 'socket.io';
import Redis from 'ioredis';

export class SocketIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  /**
   * Initialize Redis connections for pub/sub.
   *
   * Called once during app bootstrap (in main.ts).
   * We create two separate ioredis clients — one for publishing,
   * one for subscribing — then pass them to @socket.io/redis-adapter.
   *
   * Why call this separately and not in the constructor?
   * Because connectToRedis() is async (connecting to Redis takes time)
   * and constructors can't be async.
   */
  async connectToRedis(): Promise<void> {
    const redisConfig = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
    };

    // Two separate connections: one for publishing, one for subscribing
    const pubClient = new Redis(redisConfig);
    const subClient = pubClient.duplicate(); // Same config, new connection

    // Wait for both to connect before allowing events to flow
    await Promise.all([
      new Promise<void>((resolve) => pubClient.on('connect', resolve)),
      new Promise<void>((resolve) => subClient.on('connect', resolve)),
    ]);

    // createAdapter returns a factory function that socket.io calls
    // to set up the adapter on each namespace
    this.adapterConstructor = createAdapter(pubClient, subClient);

    console.log('✅ Socket.io Redis adapter connected');
  }

  /**
   * Override NestJS's createIOServer to inject our Redis adapter and CORS.
   *
   * NestJS calls this method when setting up each WebSocket gateway.
   * `port` is the port to listen on (same as HTTP in NestJS — they share a port).
   * `options` are the server options passed from the @WebSocketGateway() decorator.
   *
   * KEY LEARNING: Why do WebSocket and HTTP share a port?
   * =======================================================
   * The WebSocket protocol starts as an HTTP request with an "Upgrade" header.
   * The server upgrades the connection to WebSocket on the same TCP connection.
   * NestJS's Socket.io integration attaches to the existing HTTP server,
   * so no new port is needed.
   */
  createIOServer(port: number, options?: ServerOptions) {
    const corsOrigins = this.configService.get<string>(
      'CORS_ORIGINS',
      'http://localhost:3001',
    );

    // Pass options directly to avoid ServerOptions type incompatibilities.
    // The spread of the incoming `options` may have optional fields (like path)
    // typed as `string | undefined`, which conflicts with ServerOptions strictness.
    // Letting TypeScript infer the merged type from the call avoids this.
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: corsOrigins.split(',').map((origin) => origin.trim()),
        credentials: true, // Allow cookies in WebSocket handshake
        methods: ['GET', 'POST'],
      },
      // Allowed transports: start with polling (reliable), upgrade to websocket
      // Polling works through proxies that don't support WebSocket
      transports: ['polling', 'websocket'],
    });

    // Attach the Redis adapter to route events across server instances
    server.adapter(this.adapterConstructor);

    return server;
  }
}
