export interface CartItem {
    productId: string;
    vendorId: string;
    vendorName: string;
    name: string;
    slug: string;
    price: number;
    quantity: number;
    imageUrl: string | null;
    maxQuantity: number;
    status: string;
    addedAt: string;
    subtotal?: number;
}
export interface CartSummary {
    items: CartItem[];
    itemsByVendor: {
        [vendorId: string]: {
            vendorName: string;
            items: CartItem[];
            subtotal: number;
        };
    };
    totalItems: number;
    totalProducts: number;
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    isEmpty: boolean;
    hasUnavailableItems: boolean;
}
