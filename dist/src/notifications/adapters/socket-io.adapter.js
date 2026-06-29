"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketIoAdapter = void 0;
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const ioredis_1 = __importDefault(require("ioredis"));
class SocketIoAdapter extends platform_socket_io_1.IoAdapter {
    configService;
    adapterConstructor;
    constructor(app, configService) {
        super(app);
        this.configService = configService;
    }
    async connectToRedis() {
        const redisConfig = {
            host: this.configService.get('REDIS_HOST', 'localhost'),
            port: this.configService.get('REDIS_PORT', 6379),
            password: this.configService.get('REDIS_PASSWORD'),
            db: this.configService.get('REDIS_DB', 0),
        };
        const pubClient = new ioredis_1.default(redisConfig);
        const subClient = pubClient.duplicate();
        await Promise.all([
            new Promise((resolve) => pubClient.on('connect', resolve)),
            new Promise((resolve) => subClient.on('connect', resolve)),
        ]);
        this.adapterConstructor = (0, redis_adapter_1.createAdapter)(pubClient, subClient);
        console.log('✅ Socket.io Redis adapter connected');
    }
    createIOServer(port, options) {
        const corsOrigins = this.configService.get('CORS_ORIGINS', 'http://localhost:3001');
        const server = super.createIOServer(port, {
            ...options,
            cors: {
                origin: corsOrigins.split(',').map((origin) => origin.trim()),
                credentials: true,
                methods: ['GET', 'POST'],
            },
            transports: ['polling', 'websocket'],
        });
        server.adapter(this.adapterConstructor);
        return server;
    }
}
exports.SocketIoAdapter = SocketIoAdapter;
//# sourceMappingURL=socket-io.adapter.js.map