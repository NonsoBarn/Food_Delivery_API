"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.welcomeEmailHtml = welcomeEmailHtml;
exports.welcomeEmailSubject = welcomeEmailSubject;
function welcomeEmailHtml(email, role) {
    const roleMessages = {
        CUSTOMER: 'Browse local restaurants and get food delivered to your door.',
        VENDOR: 'Set up your store, add your menu, and start receiving orders today.',
        RIDER: 'Accept delivery requests, track your earnings, and deliver with ease.',
        ADMIN: 'You have full access to the platform dashboard.',
    };
    const message = roleMessages[role] ?? 'Welcome to the platform.';
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
        .header { background: #FF6B35; padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 24px; }
        .body { padding: 32px; }
        .body p { color: #555; line-height: 1.6; }
        .cta { display: inline-block; margin-top: 24px; padding: 12px 28px; background: #FF6B35; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold; }
        .footer { padding: 16px 32px; background: #f4f4f4; text-align: center; font-size: 12px; color: #aaa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Food Delivery!</h1>
        </div>
        <div class="body">
          <p>Hi there,</p>
          <p>Your account (<strong>${email}</strong>) has been created successfully.</p>
          <p>${message}</p>
          <a class="cta" href="#">Get Started</a>
        </div>
        <div class="footer">
          <p>You received this email because you signed up for Food Delivery App.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
function welcomeEmailSubject() {
    return 'Welcome to Food Delivery App!';
}
//# sourceMappingURL=welcome.template.js.map