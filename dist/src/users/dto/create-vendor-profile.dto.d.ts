export declare class CreateVendorProfileDto {
    businessName: string;
    businessDescription?: string;
    businessPhone?: string;
    businessAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    taxId?: string;
    businessHours?: {
        monday?: {
            open: string;
            close: string;
        };
        tuesday?: {
            open: string;
            close: string;
        };
        wednesday?: {
            open: string;
            close: string;
        };
        thursday?: {
            open: string;
            close: string;
        };
        friday?: {
            open: string;
            close: string;
        };
        saturday?: {
            open: string;
            close: string;
        };
        sunday?: {
            open: string;
            close: string;
        };
    };
}
