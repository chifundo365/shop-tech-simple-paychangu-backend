const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const verifyPayment = require('../utils/verifyPayment');
const PaymentReport = require('../models/PaymentReport');
const { sendEmail } = require("../services/emailService");
const { generatePaymentEmail } = require("../utils/emailTemplates");

const API_BASE = process.env.PAYCHANGU_API_BASE;
const SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;
const WEBHOOK_SECRET_KEY=process.env.PAYCHANGU_WEBHOOK_SECRET_KEY;
const CALLBACK_URL = process.env.PAYCHANGU_CALLBACK_URL;
const RETURN_URL = process.env.PAYCHANGU_CALLBACK_URL;

/**
 * Initiates a payment transaction to paychangu
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.initiatePayment = async (req, res) => {
  const { first_name, last_name, email, phone, amount, metadata, currency } = req.body;
  const reference = uuidv4();
  console.log('initialise payment')
  try {
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

    console.log(response.data);

    return res.status(200).json({ message: 'Payment initiated', data: response.data });
  } catch (error) {
    console.error('Payment initiation error:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Payment request failed' });
  }
};

/**
 * Handles payment verification by transaction reference_id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyPayment = async (req, res) => {
  const { tx_ref } = req.body;

  if (!tx_ref) {
    console.log("Transaction Reference not found");
    return res
      .status(200)
      .json({ success: false, message: "Transaction_id not found" });
  }

  let payment;

  try {
    payment = await Payment.findOne({ tx_ref });

    // If payment already marked failed, no need to proceed
    if (payment?.status === "failed") {
      console.log("Payment failed:", payment.tx_ref);
      return res.status(200).json({
        success: false,
        message: "Payment verification failed",
        data: payment,
      });
    }

    // If payment already marked success, skip external verification
    if (payment?.status === "success") {
      console.log("Payment already verified");
      return res.status(200).json({
        success: true,
        message: "Payment verified",
        data: payment,
      });
    }

    // Call verification endpoint
    const verification = await verifyPayment(tx_ref);

    if (!verification?.data) {
      return res.status(403).json({
        success: false,
        message: "Verification failed",
        data: payment,
      });
    }

    console.log("Verification: ", verification);

    const txData = verification.data;

    // Update only if status has changed
    if (txData.status !== payment.status) {
      payment.status = txData.status;
      payment.amount = txData.amount;

      if (txData.status === "success") {
        payment.verifiedBy = "verify-payment-endpoint";
        payment.authorization = txData.authorization;
        payment.verifiedAt = new Date();
      }

      await payment.save();
    }

    if (txData.status === "pending") {
      return res
        .status(200)
        .json({ success: false, message: txData.status, data: payment });
    }

    return res
      .status(200)
      .json({ success: true, message: txData.status, data: payment });
  } catch (error) {
    // Handle API errors (400, 404, etc.)
    if (error?.response?.status) {
      console.log("Handled error status:", error.response.status);

      // Update payment with error response data if available
      if (payment) {
        payment.status =
         error.response.data?.data?.status || "failed";
        payment.amount = error.response.data?.data?.amount || payment.amount;
        payment.verifiedBy = "verify-payment-endpoint";
        payment.verifiedAt = new Date();
        await payment.save();
      }

      return res.status(error.response.status).json({
        success: false,
        message:
          error.response.data?.data?.message ||
          error.response.data?.message ||
          "Verification failed",
        data: payment,
      });
    }

    return res
      .status(500)
      .json({ success: false, message: error.message, data: payment });
  }
};

/**
 * Handles WebHook - Server to server communication to verify PAYMENTS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.webhook = async (req, res) => {
  console.log("Webhook Hit");
  let updated = Payment.findOne(tx_ref);

  try {
    const signature = req.headers["signature"];
    const payload = req.body.toString();

    if (!signature) {
      return res.status(400).send("Missing signature header");
    }

    const hash = crypto
      .createHmac("sha256", WEBHOOK_SECRET_KEY)
      .update(payload)
      .digest("hex");

    if (hash !== signature) {
      console.error("Invalid webhook signature");
      return res.status(401).send("Invalid WebHook signature");
    }

    const webhookData = req.body;
    console.log("Successfully received webhook data:", webhookData);

    // Verify transaction with paychangu verification endpoint
    const verification = await verifyPayment(webhookData.tx_ref);

    if (!verification || verification.data.status !== webhookData.status) {
      console.error(
        `Danger: transaction with id: ${webhookData.tx_ref} not verified, webhook may be compromised`
      );
      return res
        .status(403)
        .send("Valid signature but transaction verification failed");
    }

    // Update payment record in DB
    updated = await Payment.findOneAndUpdate(
      { tx_ref: webhookData.tx_ref },
      {
        status: webhookData.data.status,
        amount: webhookData.data.amount,
        authorization: webhookData.data.authorization,
        ...(webhookData.status === "success" && {
          verifiedBy: "webhook",
          verifiedAt: new Date(),
        }),
      },
      { new: true }
    );

    // Send html based email on payment success with full info.
    await sendEmail(
      payment.email,
      `${updated.first_name} ${updated.last_name}`,
      'PAYMENT STATUS  - PURCHASING PRODUCTS THROUGH SHOP TECH',
      null,
      generatePaymentEmail(
        `${updated.first_name} ${updated.last_name}`,
        webhookData.data.status,
        webhookData.data.tx_ref,
        webhookData.data.amount,
        updated.metadata.shopName,
        updated.metadata.products
    )
  );

    return res.status(200).send("WebHook processed successfully");
  } catch (error) {
    if (error?.response?.status) {
      if (updated && updated.status !== error.response.data.data.status) {
        updated.status = error.response.data.data.status;
        updated.amount = error.response.data.data.amount;
        updated.verifiedBy = "webhook";
        updated.verifiedAt = new Date();

        await updated.save()
        
	// Send html based email on payment failed
      await sendEmail(
        payment.email,
        `${payment.first_name} ${payment.last_name}`,
        'PAYMENT STATUS  - PURCHASING PRODUCTS THROUGH SHOP TECH',
        null,
        generatePaymentEmail(
          `${updated.first_name} ${updated.last_name}`,
          error.response.data.data.status || webhookData.data.status || 'failed',
          updated.tx_ref,
          updated.amount,
          updated.metadata.shopName,
          updated.metadata.products
        )
      );
      
      }

      return res.status(error.response.status).json({
        success: false,
        message:
          error.response.data?.data?.message ||
          "Verification failed",
      });
    }

    console.error("Webhook error:", error);
    return res.status(500).send("Internal Server Error");
  }
};



/**
 * Handles PaymentReports Controllor - Gets payment reports directly from customer.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.paymentReport = async (req, res) => {
  try {

  const data = req.body;
  console.log(data);
  if (!data || !data.tx_ref || !data.email || !data.message || !data.status ) {
    return res.status(400).json({success: false, message: 'Missing required fileds', data: null});
  }


  const report = await PaymentReport.insertOne({
    tx_ref: data.tx_ref,
    email: data.email,
    status: data.status,
    message: data.description,
  });

  await report.save()
  return res.status(200).json({succes: true, message: 'Payment report submitted succesfully', data: report})

  } catch (error) {
    console.error('error submmiting response', error)
    res.status(500).json({success: false, message: 'Server Error', data: null});
  }
}

