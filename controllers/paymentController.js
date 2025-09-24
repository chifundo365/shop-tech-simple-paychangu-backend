const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const PaymentReport = require('../models/PaymentReport');
const {
  validateWebhookSignature,
  sendPaymentStatusEmail,
  verifyAndUpdatePayment,
  validatePaymentInitiation,
  validatePaymentReport
} = require('../utils/paymentHelpers');
const {
  sendSuccessResponse,
  sendErrorResponse,
  handleErrorResponse
} = require('../utils/responseHelpers');

const API_BASE = process.env.PAYCHANGU_API_BASE;
const SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;
const CALLBACK_URL = process.env.PAYCHANGU_CALLBACK_URL;
const RETURN_URL = process.env.PAYCHANGU_CALLBACK_URL;

/**
 * Initiates a payment transaction to paychangu
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, amount, metadata, currency } = req.body;

    // Validate required fields
    const validation = validatePaymentInitiation(req.body);
    if (!validation.isValid) {
      return sendErrorResponse(res, validation.message, null, 400);
    }

    const reference = uuidv4();
    console.log('Initiating payment with reference:', reference);

    // Make API request to payment gateway
    const response = await axios.post(
      `${API_BASE}/payment`,
      { 
        first_name,
        last_name,
        email,
        phone,
        amount,
        currency,
        tx_ref: reference,
        callback_url: CALLBACK_URL,
        return_url: RETURN_URL,
        customization: {
          title: 'Products Purchase Payment',
          description: 'Payment for products purchased on shop-tech',
        },	
        metadata
      },
      {
        headers: {
          'Authorization': `Bearer ${SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract transaction reference from response
    const txRef = response.data.data?.data?.tx_ref;

    // Create payment record in database
    await Payment.create({
      first_name,
      last_name,
      email,	    
      amount,
      currency,
      phone,
      tx_ref: txRef,
      metadata
    });

    console.log('Payment initiated successfully:', response.data);
    return sendSuccessResponse(res, 'Payment initiated', response.data);

  } catch (error) {
    console.error('Payment initiation error:', error?.response?.data || error.message);
    return handleErrorResponse(res, error, 'Payment request failed');
  }
};

/**
 * Handles payment verification by transaction reference_id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { tx_ref } = req.body;

    if (!tx_ref) {
      console.log("Transaction Reference not found");
      return sendErrorResponse(res, "Transaction reference not found");
    }

    const payment = await Payment.findOne({ tx_ref });

    if (!payment) {
      return sendErrorResponse(res, "Payment record not found", null, 404);
    }

    // If payment already marked failed, no need to proceed
    if (payment.status === "failed") {
      console.log("Payment failed:", payment.tx_ref);
      return sendErrorResponse(res, "Payment verification failed", payment);
    }

    // If payment already marked success, skip external verification
    if (payment.status === "success") {
      console.log("Payment already verified");
      return sendSuccessResponse(res, "Payment verified", payment);
    }

    // Verify payment and update status
    const verificationResult = await verifyAndUpdatePayment(
      tx_ref, 
      payment, 
      'verify-payment-endpoint',
      true // Enable email sending
    );

    if (!verificationResult.success) {
      return sendErrorResponse(
        res,
        verificationResult.error.message,
        verificationResult.payment,
        verificationResult.error.status
      );
    }

    const { payment: updatedPayment, data: txData } = verificationResult;

    if (txData.status === "pending") {
      return sendErrorResponse(res, txData.status, updatedPayment);
    }

    return sendSuccessResponse(res, txData.status, updatedPayment);

  } catch (error) {
    console.error('Payment verification error:', error);
    return handleErrorResponse(res, error, 'Payment verification failed');
  }
};

/**
 * Handles WebHook - Server to server communication to verify PAYMENTS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.webhook = async (req, res) => {
  console.log("Webhook Hit");
  
  try {
    const signature = req.headers["signature"];
    const payload = req.body.toString();

    // Validate webhook signature
    if (!validateWebhookSignature(signature, payload)) {
      console.error("Invalid webhook signature");
      return sendErrorResponse(res, "Invalid WebHook signature", null, 401);
    }

    const webhookData = JSON.parse(payload);
    console.log("Successfully received webhook data in JSON:", webhookData);

    // Log key webhook fields for debugging
    console.log(`🔍 Webhook payment details for ${webhookData.tx_ref}:`, {
      status: webhookData.status,
      amount: webhookData.amount,
      charge: webhookData.charge,
      currency: webhookData.currency,
      reference: webhookData.reference,
      authChannel: webhookData.authorization?.channel,
      merchantAmount: webhookData.amount_split?.amount_received_by_merchant
    });

    // Find existing payment record
    const existingPayment = await Payment.findOne({ tx_ref: webhookData.tx_ref });
    if (!existingPayment) {
      console.error(`Payment record not found for tx_ref: ${webhookData.tx_ref}`);
      return sendErrorResponse(res, "Payment record not found", null, 404);
    }

    // Verify transaction with paychangu verification endpoint
    const verificationResult = await verifyAndUpdatePayment(
      webhookData.tx_ref,
      existingPayment,
      'webhook',
      true // Enable email sending
    );

    if (!verificationResult.success) {
      return sendErrorResponse(
        res,
        verificationResult.error.message,
        null,
        verificationResult.error.status
      );
    }

    const { payment: updatedPayment, data: txData } = verificationResult;

    // Webhook status is directly accessible (not nested)
    const webhookStatus = webhookData.status;
    
    console.log(`🔍 Webhook vs Verification comparison for ${webhookData.tx_ref}:`, {
      webhookStatus: webhookStatus,
      verificationStatus: txData.status,
      webhookAmount: webhookData.amount,
      verificationAmount: txData.amount,
      webhookCharge: webhookData.charge,
      verificationCharges: txData.charges
    });

    // Verify webhook data matches verification response
    if (txData.status !== webhookStatus) {
      console.error(
        `⚠️ Danger: transaction with id: ${webhookData.tx_ref} not verified, webhook may be compromised`,
        `Webhook status: ${webhookStatus}, Verification status: ${txData.status}`
      );
      return sendErrorResponse(
        res,
        "Valid signature but transaction verification failed",
        null,
        403
      );
    }

    // Additional validation: compare amounts (webhook vs verification)
    if (Math.abs(txData.amount - webhookData.amount) > 1) { // Allow 1 unit difference for rounding
      console.error(
        `⚠️ Amount mismatch for ${webhookData.tx_ref}:`,
        `Webhook: ${webhookData.amount}, Verification: ${txData.amount}`
      );
      return sendErrorResponse(
        res,
        "Amount verification failed",
        null,
        403
      );
    }

    console.log(`✅ Webhook verification successful for ${webhookData.tx_ref} - Status: ${txData.status}`);
    return sendSuccessResponse(res, "WebHook processed successfully");

  } catch (error) {
    console.error("Webhook error:", error);
    return handleErrorResponse(res, error, "Internal Server Error", null);
  }
};



/**
 * Handles PaymentReports Controller - Gets payment reports directly from customer.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.paymentReport = async (req, res) => {
  try {
    const data = req.body;
    console.log('Payment report data:', data);

    // Validate required fields
    const validation = validatePaymentReport(data);
    if (!validation.isValid) {
      return sendErrorResponse(res, validation.message, null, 400);
    }

    // Create payment report
    const report = await PaymentReport.create({
      tx_ref: data.tx_ref,
      email: data.email,
      status: data.status,
      message: data.message,
    });

    return sendSuccessResponse(
      res,
      'Payment report submitted successfully',
      report,
      201
    );

  } catch (error) {
    console.error('Error submitting payment report:', error);
    return handleErrorResponse(res, error, 'Failed to submit payment report');
  }
};

