"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const socket_io_1 = require("socket.io");
const users_service_1 = require("../../users/users.service");
const rider_location_service_1 = require("../../delivery/services/rider-location.service");
const delivery_service_1 = require("../../delivery/services/delivery.service");
const user_role_enum_1 = require("../../common/enums/user-role.enum");
let NotificationsGateway = NotificationsGateway_1 = class NotificationsGateway {
    jwtService;
    usersService;
    riderLocationService;
    deliveryService;
    server;
    logger = new common_1.Logger(NotificationsGateway_1.name);
    constructor(jwtService, usersService, riderLocationService, deliveryService) {
        this.jwtService = jwtService;
        this.usersService = usersService;
        this.riderLocationService = riderLocationService;
        this.deliveryService = deliveryService;
    }
    async handleConnection(client) {
        try {
            const rawToken = client.handshake.auth?.token ||
                client.handshake.headers?.authorization ||
                '';
            const token = rawToken.replace(/^Bearer\s+/i, '');
            if (!token) {
                this.disconnect(client, 'No authentication token provided');
                return;
            }
            let payload;
            try {
                payload = this.jwtService.verify(token);
            }
            catch {
                this.disconnect(client, 'Invalid or expired token');
                return;
            }
            const user = await this.usersService.findByEmail(payload.email);
            if (!user) {
                this.disconnect(client, 'User not found');
                return;
            }
            const requestUser = {
                id: user.id,
                email: user.email,
                role: user.role,
            };
            if (user.vendorProfile) {
                requestUser.vendorProfile = {
                    id: user.vendorProfile.id,
                    businessName: user.vendorProfile.businessName,
                    status: user.vendorProfile.status,
                };
            }
            if (user.customerProfile) {
                requestUser.customerProfile = {
                    id: user.customerProfile.id,
                    deliveryAddress: user.customerProfile.deliveryAddress,
                    city: user.customerProfile.city,
                    state: user.customerProfile.state,
                    postalCode: user.customerProfile.postalCode,
                    latitude: user.customerProfile.latitude,
                    longitude: user.customerProfile.longitude,
                };
            }
            if (user.riderProfile) {
                requestUser.riderProfile = {
                    id: user.riderProfile.id,
                    status: user.riderProfile.status,
                    availabilityStatus: user.riderProfile.availabilityStatus,
                };
            }
            client.data.user = requestUser;
            await this.joinRoleRooms(client);
            await client.join(`user:${requestUser.id}`);
            this.logger.log(`Client connected: ${client.id} (user: ${user.email}, role: ${user.role})`);
        }
        catch (error) {
            this.disconnect(client, 'Authentication failed');
            this.logger.error(`Connection error: ${error.message}`);
        }
    }
    handleDisconnect(client) {
        const user = client.data?.user;
        if (user) {
            this.logger.log(`Client disconnected: ${client.id} (user: ${user.email})`);
        }
        else {
            this.logger.log(`Unauthenticated client disconnected: ${client.id}`);
        }
    }
    async handleOrderSubscribe(client, payload) {
        try {
            const user = client.data.user;
            const { orderId } = payload;
            if (!orderId) {
                return { success: false, message: 'orderId is required' };
            }
            await client.join(`order:${orderId}`);
            this.logger.log(`User ${user.email} subscribed to order:${orderId}`);
            return { success: true };
        }
        catch {
            return { success: false, message: 'Failed to subscribe to order' };
        }
    }
    async handleOrderUnsubscribe(client, payload) {
        const { orderId } = payload;
        await client.leave(`order:${orderId}`);
        return { success: true };
    }
    async handleLocationUpdate(client, payload) {
        const user = client.data.user;
        if (user.role !== user_role_enum_1.UserRole.RIDER || !user.riderProfile) {
            throw new websockets_1.WsException('Only riders can send location updates');
        }
        const { latitude, longitude, heading, speed } = payload;
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new websockets_1.WsException('Invalid GPS coordinates');
        }
        await this.riderLocationService.updateLocation(user.riderProfile.id, latitude, longitude, heading, speed);
        const activeDelivery = await this.deliveryService.findActiveDeliveryForRider(user.riderProfile.id);
        if (activeDelivery) {
            this.server.to(`order:${activeDelivery.orderId}`).emit('delivery:location_updated', {
                riderId: user.riderProfile.id,
                latitude,
                longitude,
                heading,
                speed,
                timestamp: new Date(),
            });
        }
    }
    async joinRoleRooms(client) {
        const user = client.data.user;
        switch (user.role) {
            case user_role_enum_1.UserRole.VENDOR:
                if (user.vendorProfile) {
                    await client.join(`vendor:${user.vendorProfile.id}`);
                    this.logger.debug(`Vendor ${user.email} joined room: vendor:${user.vendorProfile.id}`);
                }
                break;
            case user_role_enum_1.UserRole.RIDER:
                if (user.riderProfile) {
                    await client.join(`rider:${user.riderProfile.id}`);
                    this.logger.debug(`Rider ${user.email} joined room: rider:${user.riderProfile.id}`);
                }
                break;
            case user_role_enum_1.UserRole.ADMIN:
                await client.join('admin');
                this.logger.debug(`Admin ${user.email} joined room: admin`);
                break;
            case user_role_enum_1.UserRole.CUSTOMER:
                this.logger.debug(`Customer ${user.email} connected (subscribes to orders on demand)`);
                break;
        }
    }
    disconnect(client, message) {
        client.emit('error', { message });
        client.disconnect(true);
        this.logger.warn(`Disconnected unauthenticated client: ${client.id} — ${message}`);
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('order:subscribe'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsGateway.prototype, "handleOrderSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('order:unsubscribe'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsGateway.prototype, "handleOrderUnsubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('rider:location:update'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsGateway.prototype, "handleLocationUpdate", null);
exports.NotificationsGateway = NotificationsGateway = NotificationsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/notifications', cors: { origin: '*' } }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        users_service_1.UsersService,
        rider_location_service_1.RiderLocationService,
        delivery_service_1.DeliveryService])
], NotificationsGateway);
//# sourceMappingURL=notifications.gateway.js.map