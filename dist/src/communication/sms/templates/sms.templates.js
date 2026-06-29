"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsOrderConfirmation = smsOrderConfirmation;
exports.smsOrderCancelled = smsOrderCancelled;
exports.smsDeliveryAssigned = smsDeliveryAssigned;
exports.smsDeliveryCompletion = smsDeliveryCompletion;
function smsOrderConfirmation(orderNumber, vendorName) {
    const vendor = vendorName ? ` at ${vendorName}` : '';
    return `Your order ${orderNumber}${vendor} is confirmed! We'll notify you when it's ready.`;
}
function smsOrderCancelled(orderNumber) {
    return `Sorry, your order ${orderNumber} was cancelled. Contact support if you need help.`;
}
function smsDeliveryAssigned(orderNumber, riderName) {
    const rider = riderName ? ` Your rider is ${riderName}.` : '';
    return `A rider is on the way with your order ${orderNumber}.${rider}`;
}
function smsDeliveryCompletion(orderNumber) {
    return `Your order ${orderNumber} has been delivered. Enjoy your meal!`;
}
//# sourceMappingURL=sms.templates.js.map