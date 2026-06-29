import { Socket } from 'socket.io';
import { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
export interface SocketWithUser extends Socket {
    data: {
        user: RequestUser;
    };
}
