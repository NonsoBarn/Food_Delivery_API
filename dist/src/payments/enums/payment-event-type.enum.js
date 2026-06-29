"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentEventType = void 0;
var PaymentEventType;
(function (PaymentEventType) {
    PaymentEventType["PAYMENT_INITIATED"] = "payment.initiated";
    PaymentEventType["PAYMENT_SUCCESSFUL"] = "payment.successful";
    PaymentEventType["PAYMENT_FAILED"] = "payment.failed";
    PaymentEventType["REFUND_INITIATED"] = "refund.initiated";
    PaymentEventType["REFUND_SUCCESSFUL"] = "refund.successful";
    PaymentEventType["REFUND_FAILED"] = "refund.failed";
    PaymentEventType["TRANSFER_SUCCESSFUL"] = "transfer.successful";
    PaymentEventType["TRANSFER_FAILED"] = "transfer.failed";
})(PaymentEventType || (exports.PaymentEventType = PaymentEventType = {}));
//# sourceMappingURL=payment-event-type.enum.js.map