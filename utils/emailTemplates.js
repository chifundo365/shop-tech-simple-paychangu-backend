function generatePaymentEmail(name, status, txRef, amount, shopName, products = [], paymentData = {}) {
  const statusColors = {
    success: "#28a745",
    failed: "#dc3545",
    pending: "#ffc107",
  };

  const statusMessages = {
    success: "Your payment was successful! 🎉",
    failed: "Unfortunately, your payment failed. Please try again.",
    pending: "Your payment is still pending. We’ll notify you once it’s confirmed.",
  };

  // Generate product rows
  const productRows = products.map(
    (p) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${p.description}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">MWK ${p.price.toLocaleString()}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">MWK ${(p.price * p.quantity).toLocaleString()}</td>
      </tr>
    `
  ).join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Payment Status - SHOP TECH</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" 
      style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">

      <!-- Header with SHOP TECH -->
      <tr>
        <td style="background-color: #0d6efd; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SHOP TECH</h1>
        </td>
      </tr>

      <!-- Payment Info -->
      <tr>
        <td style="padding: 20px;">
          <p style="font-size: 16px; color: #333;">Hi <strong>${name}</strong>,</p>
          <p style="font-size: 15px; color: #555;">${statusMessages[status]}</p>

          <p style="margin: 15px 0; padding: 12px; border-radius: 6px; background-color: ${statusColors[status]}; color: #fff; font-size: 16px; text-align: center; font-weight: bold;">
            Status: ${status.toUpperCase()}
          </p>

          <!-- Shop Name with Icon -->
          <p style="font-size: 16px; color: #333;">
            <span style="margin-right: 6px;">🏬</span>
            <strong>Purchase from:</strong> ${shopName}
          </p>

          <p style="font-size: 16px; color: #333;"><strong>Amount Paid:</strong> MWK ${amount.toLocaleString()}</p>
          ${paymentData.charges ? `<p style="font-size: 14px; color: #666;"><strong>Transaction Fees:</strong> MWK ${paymentData.charges.toLocaleString()}</p>` : ''}
          <p style="font-size: 14px; color: #555;">Transaction Reference: <strong>${txRef}</strong></p>
          ${paymentData.reference ? `<p style="font-size: 14px; color: #555;">Payment Reference: <strong>${paymentData.reference}</strong></p>` : ''}
          ${paymentData.authorization?.channel ? `<p style="font-size: 14px; color: #666;"><strong>Payment Method:</strong> ${paymentData.authorization.channel}</p>` : ''}

          <!-- Products Table -->
          ${
            products.length > 0
              ? `
          <h3 style="margin-top: 20px; color: #333;">Products Purchased:</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 8px; border: 1px solid #ddd;">Name</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Description</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Qty</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Price</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${productRows}
            </tbody>
          </table>
          `
              : ""
          }

        </td>
      </tr>

      <!-- Footer / Contact -->
      <tr>
        <td style="padding: 20px; background-color: #f8f9fa; text-align: center;">
          <p style="font-size: 13px; color: #666; margin: 0;">
            Need help? Contact SHOP TECH support:<br/>
            <a href="mailto:support@shoptech.com" style="color: #0d6efd;">support@shoptech.com</a> | +265 999 000 111
          </p>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

module.exports = { generatePaymentEmail };
