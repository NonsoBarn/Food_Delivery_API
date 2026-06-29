import type Redis from 'ioredis';
export declare class CartCleanupJob {
    private readonly redis;
    private readonly logger;
    constructor(redis: Redis);
    reportCartStats(): Promise<void>;
}
