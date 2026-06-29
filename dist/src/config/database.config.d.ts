declare const _default: (() => {
    type: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    entities: string[];
    synchronize: boolean;
    dropSchema: boolean;
    logging: boolean;
    migrations: string[];
    migrationsTableName: string;
    ssl: boolean | {
        rejectUnauthorized: boolean;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    type: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    entities: string[];
    synchronize: boolean;
    dropSchema: boolean;
    logging: boolean;
    migrations: string[];
    migrationsTableName: string;
    ssl: boolean | {
        rejectUnauthorized: boolean;
    };
}>;
export default _default;
