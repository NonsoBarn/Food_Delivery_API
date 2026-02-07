export interface CartItem {
  productId: string;

  vendorId: string;

  vendorName: string;

  name: string;

  slug: string;

  /**
   * Price at Time of Add
   *
   * IMPORTANT: This is the price when added to cart,
   * not the current product price.
   *
   * Why freeze price?
   * - Better UX (no surprise price changes at checkout)
   * - Legal requirement in some jurisdictions
   * - Prevents vendor manipulation
   *
   * Note: We'll validate current price at checkout anyway
   */
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

  /**
   * Items Grouped by Vendor
   *
   * Useful for:
   * - Multi-vendor checkout
   * - Shipping calculation per vendor
   * - "Items from Pizza Palace" sections
   *
   * Structure:
   * {
   *   "vendor-id-1": {
   *     vendorName: "Pizza Palace",
   *     items: [...],
   *     subtotal: 25.99
   *   },
   *   "vendor-id-2": {...}
   * }
   */
  itemsByVendor: {
    [vendorId: string]: {
      vendorName: string;
      items: CartItem[];
      subtotal: number;
    };
  };

  /**
   * Total Items Count
   *
   * Sum of all quantities
   * Example: 3 burgers + 2 pizzas = 5 items
   */
  totalItems: number;

  /**
   * Total Unique Products
   *
   * Number of different products
   * Example: burgers + pizza = 2 products (even if 10 items total)
   */
  totalProducts: number;

  /**
   * Subtotal
   *
   * Sum of all item subtotals (before tax/shipping)
   * price1 * qty1 + price2 * qty2 + ...
   */
  subtotal: number;

  /**
   * Estimated Tax
   *
   * Tax calculation (future feature)
   * For now: 0
   */
  tax: number;

  /**
   * Estimated Shipping
   *
   * Shipping calculation (future feature)
   * For now: 0
   */
  shipping: number;

  /**
   * Total
   *
   * subtotal + tax + shipping
   * This is what customer pays
   */
  total: number;

  /**
   * Cart Empty Flag
   *
   * Convenience flag for frontend
   */
  isEmpty: boolean;

  /**
   * Has Unavailable Items
   *
   * True if any item is out_of_stock or inactive
   * Prevents checkout if true
   */
  hasUnavailableItems: boolean;
}
