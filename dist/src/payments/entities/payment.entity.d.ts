import { Order } from '../../orders/entities/order.entity';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentStatus } from '../../orders/enums/payment-status.enum';
export declare enum PaymentTransactionType {
    CHARGE = "charge",
    REFUND = "refund",
    TRANSFER = "transfer"
}
export declare class Payment {
    id: string;
    orderId: string;
    order: Order;
    orderGroupId: string;
    provider: PaymentProvider;
    transactionId: string;
    transactionType: PaymentTransactionType;
    amount: number;
    currency: string;
    status: PaymentStatus;
    customerId: string;
    customerEmail: string;
    vendorId: string;
    metadata: Record<string, any>;
    errorMessage: string;
    errorCode: string;
    refundedPaymentId: string;
    isRefunded: boolean;
    refundedAmount: number;
    transferId: string;
    isTransferred: boolean;
    transferredAt: Date;
    paidAt: Date;
    failedAt: Date;
    refundedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
