/**
 * SocketWithUser Interface
 *
 * Extends Socket.io's base Socket type to include our application user.
 *
 * KEY LEARNING: Why Extend Socket?
 * ==================================
 * Socket.io's Socket type has a `data` property typed as `any`.
 * That means socket.data.user would be typed as `any` — no autocomplete,
 * no compile-time checks, no safety.
 *
 * By creating this interface, we tell TypeScript:
 *   "Every socket in our gateway has a .data.user of type RequestUser"
 *
 * Now socket.data.user.vendorProfile.id gives you full type safety
 * instead of having to cast or check types manually.
 *
 * Usage:
 * ```typescript
 * @SubscribeMessage('order:subscribe')
 * handleSubscribe(client: SocketWithUser, payload: { orderId: string }) {
 *   const user = client.data.user;  // ← TypeScript knows this is RequestUser
 *   if (user.role === UserRole.CUSTOMER) {
 *     client.join(`order:${payload.orderId}`);
 *   }
 * }
 * ```
 */

import { Socket } from 'socket.io';
import { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

export interface SocketWithUser extends Socket {
  data: {
    user: RequestUser;
  };
}
