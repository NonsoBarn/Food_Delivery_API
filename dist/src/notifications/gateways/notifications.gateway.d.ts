import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'socket.io';
import { UsersService } from '../../users/users.service';
import { RiderLocationService } from '../../delivery/services/rider-location.service';
import { DeliveryService } from '../../delivery/services/delivery.service';
import type { SocketWithUser } from '../interfaces/socket-with-user.interface';
import type { RiderLocationUpdatePayload } from '../events/notification-events';
export declare class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly usersService;
    private readonly riderLocationService;
    private readonly deliveryService;
    server: Server;
    private readonly logger;
    constructor(jwtService: JwtService, usersService: UsersService, riderLocationService: RiderLocationService, deliveryService: DeliveryService);
    handleConnection(client: SocketWithUser): Promise<void>;
    handleDisconnect(client: SocketWithUser): void;
    handleOrderSubscribe(client: SocketWithUser, payload: {
        orderId: string;
    }): Promise<{
        success: boolean;
        message?: string;
    }>;
    handleOrderUnsubscribe(client: SocketWithUser, payload: {
        orderId: string;
    }): Promise<{
        success: boolean;
    }>;
    handleLocationUpdate(client: SocketWithUser, payload: RiderLocationUpdatePayload): Promise<void>;
    private joinRoleRooms;
    private disconnect;
}
