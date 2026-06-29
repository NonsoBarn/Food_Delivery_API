import { CustomerProfile } from '../../users/entities/customer-profile.entity';
import { VendorProfile } from '../../users/entities/vendor-profile.entity';
import { Order } from '../../orders/entities/order.entity';
export declare class VendorReview {
    id: string;
    customer: CustomerProfile;
    customerId: string;
    vendor: VendorProfile;
    vendorId: string;
    order: Order;
    orderId: string;
    rating: number;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}
