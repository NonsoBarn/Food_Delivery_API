"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryCompletionHtml = deliveryCompletionHtml;
exports.deliveryCompletionSubject = deliveryCompletionSubject;
function deliveryCompletionHtml(data) {
    const deliveredAt = new Date(data.deliveredAt).toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
        .header { background: #27ae60; padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; }
        .body { padding: 32px; text-align: center; }
        .body p { color: #555; line-height: 1.6; }
        .check { font-size: 64px; }
        .meta { font-size: 13px; color: #aaa; margin-top: 16px; }
        .footer { padding: 16px 32px; background: #f4f4f4; text-align: center; font-size: 12px; color: #aaa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your order has arrived!</h1>
        </div>
        <div class="body">
          <p class="check">✅</p>
          <p>Order <strong>${data.orderNumber}</strong> was delivered successfully.</p>
          <p class="meta">Delivered at: ${deliveredAt}</p>
          <p style="margin-top:24px;">Enjoy your meal! Don't forget to rate your experience.</p>
        </div>
        <div class="footer">
          <p>Food Delivery App — Thank you for ordering with us!</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
function deliveryCompletionSubject(orderNumber) {
    return `Order ${orderNumber} delivered — enjoy your meal!`;
}
//# sourceMappingURL=delivery-completion.template.js.map