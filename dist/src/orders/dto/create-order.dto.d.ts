import { PaymentMethod } from '../enums/payment-method.enum';
export declare class CreateOrderDto {
    paymentMethod: PaymentMethod;
    deliveryAddress?: string;
    customerNotes?: string;
}
