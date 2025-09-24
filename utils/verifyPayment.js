const axios = require("axios");

const API_BASE = process.env.PAYCHANGU_API_BASE;
const SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;

/**
 * Verify a payment by transaction reference
 * @param {string} txRef - The transaction reference (tx_ref)
 * @returns {Promise<Object>} - Returns verification data if successful
 * @throws {Error} - Throws error if verification fails or request errors
 */
async function verifyPayment(txRef) {
  if (!txRef) throw new Error("Missing Transaction id");

  try {
    const response = await axios.get(`${API_BASE}/verify-payment/${txRef}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SECRET_KEY}`
      }
    });

    console.log(`Transaction verification successful for tx_ref: ${txRef}`);

    return response.data;
  } catch (error) {
    console.error(
      `Payment verification failed for tx_ref: ${txRef}`,
      error.response?.data || error.message
    );
    
    // If PayChangu returns 400 but with valid payment data, treat it as a successful response
    if (error?.response?.status === 400) {
      const paymentData = error.response.data?.data;
      if (paymentData && paymentData.status && paymentData.tx_ref) {
        console.log(`PayChangu 400 response contains valid payment data for ${txRef} - treating as successful verification`);
        return error.response.data;
      }
    }
    
    throw error;
  }
}

module.exports = verifyPayment;
