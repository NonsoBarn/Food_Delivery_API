import type { StatusEmailData } from '../interfaces/email-service.interface';
export declare function orderStatusUpdateHtml(data: StatusEmailData): string;
export declare function orderStatusUpdateSubject(orderNumber: string, status: string): string;
