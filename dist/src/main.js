"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const socket_io_adapter_1 = require("./notifications/adapters/socket-io.adapter");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
async function loadSecrets() {
    const secretName = process.env.SECRET_NAME;
    if (!secretName)
        return;
    const client = new client_secrets_manager_1.SecretsManagerClient({
        region: process.env.AWS_REGION || 'eu-west-2',
    });
    const response = await client.send(new client_secrets_manager_1.GetSecretValueCommand({ SecretId: secretName }));
    if (!response.SecretString)
        return;
    const secrets = JSON.parse(response.SecretString);
    for (const [key, value] of Object.entries(secrets)) {
        process.env[key] = value;
    }
}
async function bootstrap() {
    await loadSecrets();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        rawBody: true,
    });
    app.enableVersioning({
        type: common_1.VersioningType.URI,
        defaultVersion: '1',
        prefix: 'api/v',
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const configService = app.get(config_1.ConfigService);
    const socketAdapter = new socket_io_adapter_1.SocketIoAdapter(app, configService);
    await socketAdapter.connectToRedis();
    app.useWebSocketAdapter(socketAdapter);
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('Food Delivery API')
        .setDescription('REST API for the Food Delivery platform')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('docs', app, document);
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`🚀 Application is running on: http://localhost:${port}`);
    console.log(`📡 API v1: http://localhost:${port}/api/v1`);
    console.log(`📖 Swagger docs: http://localhost:${port}/docs`);
    console.log(`🔌 WebSocket: ws://localhost:${port}/socket.io/notifications`);
}
bootstrap();
//# sourceMappingURL=main.js.map