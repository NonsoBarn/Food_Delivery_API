import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SocketIoAdapter } from './notifications/adapters/socket-io.adapter';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

async function loadSecrets(): Promise<void> {
  const secretName = process.env.SECRET_NAME;
  if (!secretName) return;

  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || 'eu-west-2',
  });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName }),
  );

  if (!response.SecretString) return;

  const secrets: Record<string, string> = JSON.parse(response.SecretString);
  for (const [key, value] of Object.entries(secrets)) {
    process.env[key] = value as string;
  }
}

async function bootstrap() {
  await loadSecrets();
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for webhook signature verification
  });

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1', // Default to v1 if no version specified
    prefix: 'api/v', // Creates /api/v1, /api/v2, etc.
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert types automatically
      },
    }),
  );

  /**
   * Custom Socket.io adapter with Redis pub/sub.
   *
   * KEY LEARNING: Why configure the adapter BEFORE app.listen()?
   * ==============================================================
   * NestJS mounts WebSocket gateways when the application starts listening.
   * If we add the adapter after listen(), the gateways are already mounted
   * with the DEFAULT adapter (no Redis, limited CORS).
   *
   * Order matters:
   * 1. Create app
   * 2. Configure adapter  ← here, before listen
   * 3. Listen
   *
   * The adapter's connectToRedis() is async — it creates two ioredis
   * connections and waits for them to be ready before the app starts
   * accepting WebSocket connections.
   */
  const configService = app.get(ConfigService);
  const socketAdapter = new SocketIoAdapter(app, configService);
  await socketAdapter.connectToRedis();
  app.useWebSocketAdapter(socketAdapter);

  // Swagger UI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Food Delivery API')
    .setDescription('REST API for the Food Delivery platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Get port from environment or default to 3000
  const port = process.env.PORT || 3000;

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📡 API v1: http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger docs: http://localhost:${port}/docs`);
  console.log(`🔌 WebSocket: ws://localhost:${port}/socket.io/notifications`);
}
bootstrap();
