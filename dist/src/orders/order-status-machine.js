"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canTransition = canTransition;
exports.canRoleTransition = canRoleTransition;
exports.getValidNextStatuses = getValidNextStatuses;
const order_status_enum_1 = require("./enums/order-status.enum");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const VALID_TRANSITIONS = {
    [order_status_enum_1.OrderStatus.PENDING]: [order_status_enum_1.OrderStatus.CONFIRMED, order_status_enum_1.OrderStatus.CANCELLED],
    [order_status_enum_1.OrderStatus.CONFIRMED]: [order_status_enum_1.OrderStatus.PREPARING, order_status_enum_1.OrderStatus.CANCELLED],
    [order_status_enum_1.OrderStatus.PREPARING]: [
        order_status_enum_1.OrderStatus.READY_FOR_PICKUP,
        order_status_enum_1.OrderStatus.CANCELLED,
    ],
    [order_status_enum_1.OrderStatus.READY_FOR_PICKUP]: [
        order_status_enum_1.OrderStatus.PICKED_UP,
        order_status_enum_1.OrderStatus.CANCELLED,
    ],
    [order_status_enum_1.OrderStatus.PICKED_UP]: [order_status_enum_1.OrderStatus.DELIVERED],
    [order_status_enum_1.OrderStatus.DELIVERED]: [],
    [order_status_enum_1.OrderStatus.CANCELLED]: [],
};
const TRANSITION_ROLES = {
    [`${order_status_enum_1.OrderStatus.PENDING}->${order_status_enum_1.OrderStatus.CONFIRMED}`]: [
        user_role_enum_1.UserRole.VENDOR,
        user_role_enum_1.UserRole.ADMIN,
    ],
    [`${order_status_enum_1.OrderStatus.PENDING}->${order_status_enum_1.OrderStatus.CANCELLED}`]: [
        user_role_enum_1.UserRole.CUSTOMER,
        user_role_enum_1.UserRole.VENDOR,
        user_role_enum_1.UserRole.ADMIN,
    ],
    [`${order_status_enum_1.OrderStatus.CONFIRMED}->${order_status_enum_1.OrderStatus.PREPARING}`]: [
        user_role_enum_1.UserRole.VENDOR,
        user_role_enum_1.UserRole.ADMIN,
    ],
    [`${order_status_enum_1.OrderStatus.CONFIRMED}->${order_status_enum_1.OrderStatus.CANCELLED}`]: [
        user_role_enum_1.UserRole.CUSTOMER,
        user_role_enum_1.UserRole.VENDOR,
        user_role_enum_1.UserRole.ADMIN,
    ],
    [`${order_status_enum_1.OrderStatus.PREPARING}->${order_status_enum_1.OrderStatus.READY_FOR_PICKUP}`]: [
        user_role_enum_1.UserRole.VENDOR,
        user_role_enum_1.UserRole.ADMIN,
    ],
    [`${order_status_enum_1.OrderStatus.PREPARING}->${order_status_enum_1.OrderStatus.CANCELLED}`]: [
        user_role_enum_1.UserRole.VENDOR,
        user_role_enum_1.UserRole.ADMIN,
    ],
    [`${order_status_enum_1.OrderStatus.READY_FOR_PICKUP}->${order_status_enum_1.OrderStatus.PICKED_UP}`]: [
        user_role_enum_1.UserRole.RIDER,
        user_role_enum_1.UserRole.ADMIN,
    ],
    [`${order_status_enum_1.OrderStatus.READY_FOR_PICKUP}->${order_status_enum_1.OrderStatus.CANCELLED}`]: [
        user_role_enum_1.UserRole.ADMIN,
    ],
    [`${order_status_enum_1.OrderStatus.PICKED_UP}->${order_status_enum_1.OrderStatus.DELIVERED}`]: [
        user_role_enum_1.UserRole.RIDER,
        user_role_enum_1.UserRole.ADMIN,
    ],
};
function canTransition(from, to) {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
function canRoleTransition(from, to, role) {
    if (!canTransition(from, to)) {
        return false;
    }
    const key = `${from}->${to}`;
    return TRANSITION_ROLES[key]?.includes(role) ?? false;
}
function getValidNextStatuses(currentStatus, role) {
    const possibleNext = VALID_TRANSITIONS[currentStatus] || [];
    return possibleNext.filter((nextStatus) => {
        const key = `${currentStatus}->${nextStatus}`;
        return TRANSITION_ROLES[key]?.includes(role) ?? false;
    });
}
//# sourceMappingURL=order-status-machine.js.map