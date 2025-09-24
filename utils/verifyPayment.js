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
    console.log(`Response structure:`, {
      status: response.data.status,
      message: response.data.message,
      hasData: !!response.data.data,
      dataKeys: response.data.data ? Object.keys(response.data.data) : null
    });

    return response.data;
  } catch (error) {
    console.error(
      `Payment verification failed for tx_ref: ${txRef}`,
      error.response?.data || error.message
    );
    throw error;
  }
}

module.exports = verifyPayment;
