const brevo = require("@getbrevo/brevo");


const API_KEY = process.env.BREVO_API_KEY?.trim(); // Remove any whitespace/newlines
const SENDER_EMAIL = process.env.EMAIL_SENDER_EMAIL?.trim();
const SENDER_NAME = process.env.EMAIL_SENDER_NAME?.trim();

// Debug logging (remove in production)
console.log('Email Service Configuration:');
console.log('API_KEY length:', API_KEY?.length);
console.log('API_KEY starts with:', API_KEY?.substring(0, 10));
console.log('API_KEY ends with:', API_KEY?.substring(-10));
console.log('Sender Email:', SENDER_EMAIL);
console.log('Sender Name:', SENDER_NAME);

/**
 * sendEmail - sends an email using bravo
 * @param: to - receiver email
 * @pram: name - reciver name
 * @param: subject - email subject
 * @param: text - text content to send
 * @param: html - html content to send
 */
async function sendEmail(to, name, subject, text, html) {
  try {
    // Validate API key
    if (!API_KEY || API_KEY.includes('\r') || API_KEY.includes('\n') || API_KEY.includes('+')) {
      console.error('Invalid API key format detected:', {
        hasKey: !!API_KEY,
        keyLength: API_KEY?.length,
        hasCarriageReturn: API_KEY?.includes('\r'),
        hasNewline: API_KEY?.includes('\n'),
        hasPlus: API_KEY?.includes('+'),
        keyPreview: API_KEY?.substring(0, 20) + '...'
      });
      throw new Error('Invalid BREVO_API_KEY format. Please check your environment variable.');
    }

    console.log('Sending email to:', to, 'Subject:', subject);
    console.log('Using API key (first 20 chars):', API_KEY.substring(0, 20) + '...');

    const emailAPI = new brevo.TransactionalEmailsApi();
    emailAPI.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, API_KEY);

    const message = new brevo.SendSmtpEmail();
    message.subject = subject;
    if (text) message.textContent = text;
    if (html) message.htmlContent = html;
    message.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
    message.to = [{ email: to, name }];

    const response = await emailAPI.sendTransacEmail(message);
    console.log("Email sent successfully:", {
      messageId: response.body?.messageId,
      to: to,
      subject: subject
    });
    return response.body;
  } catch (err) {
    console.error("Error sending email:", {
      error: err.response?.body || err.message,
      to: to,
      subject: subject,
      apiKeyValid: !!(API_KEY && !API_KEY.includes('\r') && !API_KEY.includes('\n'))
    });
    throw err;
  }
}

module.exports = { sendEmail };
