import { VendorStatus } from '../../users/entities/vendor-profile.entity';
export declare class VendorActionDto {
    status: VendorStatus;
    rejectionReason?: string;
    suspensionReason?: string;
}
