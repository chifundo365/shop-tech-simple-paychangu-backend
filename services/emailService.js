const brevo = require("@getbrevo/brevo");


const API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.EMAIL_SENDER_EMAIL
const SENDER_NAME = process.env.EMAIL_SENDER_NAME

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
    const emailAPI = new brevo.TransactionalEmailsApi();
    emailAPI.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, API_KEY);

    const message = new brevo.SendSmtpEmail();
    message.subject = subject;
    if (text) message.textContent = text;
    if (html) message.htmlContent = html;
    message.sender = { name: SENDER_NAME, email:SENDER_EMAIL };
    message.to = [{ email: to, name }];

    const response = await emailAPI.sendTransacEmail(message);
    console.log("Email sent successfully:", JSON.stringify(response.body, null, 2));
    return response.body;
  } catch (err) {
    console.error("Error sending email:", err.response?.body || err.message);
    throw err;
  }
}

module.exports = { sendEmail };
