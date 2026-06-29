import type { OrderEmailData } from '../interfaces/email-service.interface';
export declare function orderConfirmationHtml(data: OrderEmailData): string;
export declare function orderConfirmationSubject(orderNumber: string): string;
