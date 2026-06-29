"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const nest_winston_1 = require("nest-winston");
const event_emitter_1 = require("@nestjs/event-emitter");
const bullmq_1 = require("@nestjs/bullmq");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const database_module_1 = require("./database/database.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const typeorm_exception_filter_1 = require("./common/filters/typeorm-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const request_id_middleware_1 = require("./common/middleware/request-id.middleware");
const logger_config_1 = require("./config/logger.config");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const categories_module_1 = require("./products/categories.module");
const storage_module_1 = require("./storage/storage.module");
const products_module_1 = require("./products/products.module");
const redis_module_1 = require("./redis/redis.module");
const cart_module_1 = require("./cart/cart.module");
const orders_module_1 = require("./orders/orders.module");
const payments_module_1 = require("./payments/payments.module");
const delivery_module_1 = require("./delivery/delivery.module");
const notifications_module_1 = require("./notifications/notifications.module");
const communication_module_1 = require("./communication/communication.module");
const scheduled_jobs_module_1 = require("./scheduled-jobs/scheduled-jobs.module");
const reviews_module_1 = require("./reviews/reviews.module");
const admin_module_1 = require("./admin/admin.module");
const vendors_module_1 = require("./vendors/vendors.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_id_middleware_1.RequestIdMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
            }),
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    connection: {
                        host: config.get('REDIS_HOST') ?? 'localhost',
                        port: config.get('REDIS_PORT') ?? 6379,
                    },
                }),
            }),
            event_emitter_1.EventEmitterModule.forRoot({
                wildcard: false,
                delimiter: '.',
                global: true,
            }),
            schedule_1.ScheduleModule.forRoot(),
            nest_winston_1.WinstonModule.forRoot(logger_config_1.loggerConfig),
            database_module_1.DatabaseModule,
            redis_module_1.RedisModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            categories_module_1.CategoriesModule,
            products_module_1.ProductsModule,
            cart_module_1.CartModule,
            orders_module_1.OrdersModule,
            payments_module_1.PaymentsModule,
            delivery_module_1.DeliveryModule,
            notifications_module_1.NotificationsModule,
            communication_module_1.CommunicationModule,
            scheduled_jobs_module_1.ScheduledJobsModule,
            reviews_module_1.ReviewsModule,
            admin_module_1.AdminModule,
            vendors_module_1.VendorsModule,
            storage_module_1.StorageModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_FILTER,
                useClass: typeorm_exception_filter_1.TypeOrmExceptionFilter,
            },
            {
                provide: core_1.APP_FILTER,
                useClass: http_exception_filter_1.AllExceptionsFilter,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: logging_interceptor_1.LoggingInterceptor,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map