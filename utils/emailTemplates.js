function generatePaymentEmail(name, status, txRef, amount, shopName, products = [], paymentData = {}) {
  console.log("Payment Data >>>>>>>>>>>>>>>>>>>>>>>>", paymentData);
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const statusConfig = {
    success: {
      color: "#10B981",
      background: "#ECFDF5",
      border: "#10B981",
      icon: "✅",
      title: "Payment Successful",
      message: "Thank you! Your payment has been processed successfully.",
      actionText: "Your order is being prepared and you'll receive updates soon."
    },
    failed: {
      color: "#EF4444",
      background: "#FEF2F2",
      border: "#EF4444",
      icon: "❌",
      title: "Payment Failed",
      message: "We couldn't process your payment. Please try again.",
      actionText: "If you continue to experience issues, contact our support team."
    },
    pending: {
      color: "#F59E0B",
      background: "#FFFBEB",
      border: "#F59E0B",
      icon: "⏳",
      title: "Payment Pending",
      message: "Your payment is being processed. We'll notify you once it's confirmed.",
      actionText: "This usually takes a few minutes. No action required from you."
    }
  };

  const config = statusConfig[status];

  const statusMessages = {
    success: "Your payment was successful!",
    failed: "Unfortunately, your payment failed. Please try again.",
    pending: "Your payment is still pending. We’ll notify you once it’s confirmed.",
  };

  const productRows = products.map(
    (p) => `
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 16px 0; vertical-align: top;">
          <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${p.name}</div>
          <div style="font-size: 14px; color: #6B7280;">${p.description}</div>
        </td>
        <td style="padding: 16px 0; text-align: center; vertical-align: top; font-weight: 500; color: #374151;">
          ${p.quantity}
        </td>
        <td style="padding: 16px 0; text-align: right; vertical-align: top;">
          <div style="font-weight: 600; color: #111827;">${paymentData.currency} ${(p.price * p.quantity).toLocaleString()}</div>
          <div style="font-size: 14px; color: #6B7280;">${paymentData.currency} ${p.price.toLocaleString()} each</div>
        </td>
      </tr>
    `
  ).join("");

  const totalAmount = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment ${config.title} - SHOP TECH</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    </style>
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
    
    <!-- Email Container -->
    <div style="padding: 40px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow: hidden;">
        
        <!-- Header  -->
        <tr>
          <td style="background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%); padding: 40px 40px 30px; text-align: center;">
            <div style="background: rgba(255, 255, 255, 0.1); display: inline-block; padding: 12px 24px; border-radius: 50px; margin-bottom: 16px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 1px;">SHOP TECH</h1>
            </div>
            <p style="margin: 0; color: rgba(255, 255, 255, 0.8); font-size: 16px;">Payment Receipt</p>
          </td>
        </tr>

        <!-- Status Banner -->
        <tr>
          <td style="padding: 0;">
            <div style="background: ${config.background}; border-left: 4px solid ${config.border}; padding: 24px 40px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 8px;">${config.icon}</div>
              <h2 style="margin: 0 0 8px 0; color: ${config.color}; font-size: 24px; font-weight: 700;">${config.title}</h2>
              <p style="margin: 0 0 8px 0; color: #374151; font-size: 16px; font-weight: 500;">${config.message}</p>
              <p style="margin: 0; color: #6B7280; font-size: 14px;">${config.actionText}</p>
            </div>
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding: 40px;">
            
            <!-- Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">Hello ${name},</h3>
              <p style="margin: 0; color: #6B7280; font-size: 16px; line-height: 1.6;">Here are the details of your recent transaction with <strong style="color: #111827;">${shopName}</strong>.</p>
            </div>

            <!-- Transaction Details Card -->
            <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h4 style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: 600;">Transaction Details</h4>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-size: 14px; font-weight: 500;">Amount</td>
                  <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 18px; font-weight: 700;">${paymentData.currency} ${amount.toLocaleString()}</td>
                </tr>
                ${paymentData.charges ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Transaction Fee</td>
                  <td style="padding: 8px 0; text-align: right; color: #6B7280; font-size: 14px;">${paymentData.currency} ${paymentData.charges.toLocaleString()}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Transaction ID</td>
                  <td style="padding: 8px 0; text-align: right; color: #374151; font-size: 14px; font-family: monospace; background: #E5E7EB; padding: 4px 8px; border-radius: 4px;">${txRef}</td>
                </tr>
                ${paymentData.reference ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Payment Reference</td>
                  <td style="padding: 8px 0; text-align: right; color: #374151; font-size: 14px; font-family: monospace;">${paymentData.reference}</td>
                </tr>
                ` : ''}
                ${paymentData.authorization?.channel ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Payment Method</td>
                  <td style="padding: 8px 0; text-align: right; color: #374151; font-size: 14px; text-transform: capitalize;">${paymentData.authorization.channel}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Date & Time</td>
                  <td style="padding: 8px 0; text-align: right; color: #374151; font-size: 14px;">${currentDate}</td>
                </tr>
              </table>
            </div>

            <!-- Products Section -->
            ${products.length > 0 ? `
            <div style="margin-bottom: 32px;">
              <h4 style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: 600;">Order Summary</h4>
              <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <thead>
                    <tr style="background: #F9FAFB;">
                      <th style="padding: 16px 20px; text-align: left; color: #374151; font-size: 14px; font-weight: 600;">Item</th>
                      <th style="padding: 16px 0; text-align: center; color: #374151; font-size: 14px; font-weight: 600;">Qty</th>
                      <th style="padding: 16px 20px; text-align: right; color: #374151; font-size: 14px; font-weight: 600;">Total</th>
                    </tr>
                  </thead>
                  <tbody style="background: #ffffff;">
                    ${productRows}
                  </tbody>
                </table>
                
                ${totalAmount !== amount ? `
                <div style="background: #F9FAFB; padding: 16px 20px; border-top: 1px solid #E5E7EB;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color: #6B7280; font-size: 14px;">Subtotal</td>
                      <td style="text-align: right; color: #374151; font-size: 14px; font-weight: 500;">${paymentData.currency} ${totalAmount.toLocaleString()}</td>
                    </tr>
                    ${paymentData.charges ? `
                    <tr>
                      <td style="color: #6B7280; font-size: 14px; padding-top: 8px;">Fees</td>
                      <td style="text-align: right; color: #374151; font-size: 14px; padding-top: 8px;">${paymentData.currency} ${paymentData.charges.toLocaleString()}</td>
                    </tr>
                    ` : ''}
                    <tr style="border-top: 1px solid #E5E7EB;">
                      <td style="color: #111827; font-size: 16px; font-weight: 700; padding-top: 12px;">Total</td>
                      <td style="text-align: right; color: #111827; font-size: 16px; font-weight: 700; padding-top: 12px;">${paymentData.currency} ${amount.toLocaleString()}</td>
                    </tr>
                  </table>
                </div>
                ` : ''}
              </div>
            </div>
            ` : ''}

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background: #F9FAFB; padding: 32px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
            <div style="margin-bottom: 20px;">
              <h4 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 600;">Need Help?</h4>
              <p style="margin: 0 0 16px 0; color: #6B7280; font-size: 14px; line-height: 1.6;">Our support team is here to help you with any questions or concerns.</p>
              <div style="display: inline-block;">
                <a href="mailto:support@shoptech.com" style="display: inline-block; background: #1e40af; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 0 8px;">Contact Support</a>
              </div>
            </div>
            
            <div style="border-top: 1px solid #E5E7EB; padding-top: 20px;">
              <p style="margin: 0; color: #9CA3AF; font-size: 12px; line-height: 1.5;">
                This email was sent by SHOP TECH<br>
                If you have any questions, reply to this email or contact us at support@shoptech.com
              </p>
            </div>
          </td>
        </tr>

      </table>
    </div>
  </body>
  </html>
  `;
}

module.exports = { generatePaymentEmail };
