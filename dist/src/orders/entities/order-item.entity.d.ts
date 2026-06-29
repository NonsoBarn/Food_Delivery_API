import { Order } from './order.entity';
export declare class OrderItem {
    id: string;
    order: Order;
    orderId: string;
    productId: string;
    productName: string;
    productSlug: string;
    productImageUrl: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    createdAt: Date;
}
