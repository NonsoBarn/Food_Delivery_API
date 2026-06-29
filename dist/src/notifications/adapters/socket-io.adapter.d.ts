import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
export declare class SocketIoAdapter extends IoAdapter {
    private readonly configService;
    private adapterConstructor;
    constructor(app: INestApplicationContext, configService: ConfigService);
    connectToRedis(): Promise<void>;
    createIOServer(port: number, options?: ServerOptions): any;
}
