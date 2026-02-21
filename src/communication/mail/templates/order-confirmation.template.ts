import type { OrderEmailData } from '../interfaces/email-service.interface';

/**
 * Order Confirmation Email Template
 *
 * Sent immediately after the customer places an order.
 * Contains order number, vendor, item count, total, delivery address.
 */
export function orderConfirmationHtml(data: OrderEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
        .header { background: #FF6B35; padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; }
        .body { padding: 32px; }
        .body p { color: #555; line-height: 1.6; }
        .order-box { background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 20px; margin-top: 16px; }
        .order-box .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .order-box .label { color: #888; }
        .order-box .value { color: #333; font-weight: bold; }
        .total { border-top: 2px solid #FF6B35; padding-top: 12px; margin-top: 12px; }
        .footer { padding: 16px 32px; background: #f4f4f4; text-align: center; font-size: 12px; color: #aaa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmed!</h1>
        </div>
        <div class="body">
          <p>Great news! Your order has been placed and is waiting for the restaurant to confirm.</p>
          <div class="order-box">
            <div class="row"><span class="label">Order Number</span><span class="value">${data.orderNumber}</span></div>
            <div class="row"><span class="label">Restaurant</span><span class="value">${data.vendorName}</span></div>
            <div class="row"><span class="label">Items</span><span class="value">${data.itemCount} item(s)</span></div>
            <div class="row"><span class="label">Delivery To</span><span class="value">${data.deliveryAddress}</span></div>
            <div class="row total"><span class="label">Total</span><span class="value">₦${data.total.toFixed(2)}</span></div>
          </div>
          <p style="margin-top:24px; color:#888; font-size:13px;">
            We will send you another email when the restaurant confirms your order.
          </p>
        </div>
        <div class="footer">
          <p>Food Delivery App — Questions? Reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function orderConfirmationSubject(orderNumber: string): string {
  return `Order ${orderNumber} received — waiting for restaurant confirmation`;
}
