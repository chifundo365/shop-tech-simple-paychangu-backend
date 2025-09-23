const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const verifyPayment = require('../utils/verifyPayment');
const PaymentReport = require('../models/PaymentReport');

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

    res.status(200).json({ message: 'Payment initiated', data: response.data });
  } catch (error) {
    console.error('Payment initiation error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Payment request failed' });
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
    console.log('Transaction Reference not found');
    return res.status(200).json({success: false, message: 'Transaction_id not fouund'})	  
  }

  let payment;

  try {


    payment = await Payment.findOne({tx_ref});
    
    // Check if status has been marked failed by background-job
    if (payment?.status == 'failed') {
      console.log('Payment failed: tx_ref:', payment.tx_ref)
      return res.status(200).json({ success:false, message: 'Payment verification failed', data: payment});
    }
 

    // check if the payment has been marked success by webhook or background job and skip calling  verification endpoint
    if (payment?.status === 'success') {
      console.log('payment already verified');	    
      return res.status(200).json({success: true, message: 'Payment verified', data: payment});
    }
    
    const verification = await verifyPayment(tx_ref);

    if (!verification || verification.status !== 'success') {
      return res.status(403).json({ success:false,  message: 'Verification failed', data: payment });
    }

   console.log('Verification: ', verification);

    const txData = verification.data;

    // Update payment record in database

    payment.status = txData.status,
    payment.amount =  txData.amount,
    payment.authorization = txData.authorization,
    payment.verifiedBy = 'verify-payment-endpoint',
    payment.verifiedAt = new Date();

    await payment.save();
    
    console.log("Verified and updated the DB");

    return res.status(200).json({ success:true, message: `Payment with Transaction id ${tx_ref} is succesful`, data: payment});
  } catch (error) {
    if (error?.response?.status) {
      console.log('Handled error status:', error.response.status);
      return res.status(error.response.status).json({
        success: false,
        message:
          error.response.data?.data?.message ||
          error.response.data?.message ||
          'Verification failed',
	data: payment,
      });
    }
    return res.status(500).json({ success:false, message: error.message, data:payment});
  }
};



/**
 * Handles WebHook - Server to server communication to verify PAYMENTS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.webhook = async (req, res) => {
  console.log('webhook Hit')
  try {
    const signature = req.headers['signature'];
    const payload = req.body.toString();

    if (!signature) {
      res.status(400).send('Missing signature header')
    }

    const hash = crypto
      .createHmac('sha256', WEBHOOK_SECRET_KEY)
      .update(payload)
      .digest('hex');

    if (hash !== signature) {
      console.error('Invalid webhook signature')
      return res.status(401).send("Invalid WebHook signature");
    }

    const webhookData = JSON.parse(payload);
    console.log('successfully received webhook data', webhookData);

    // verify transaction with paychangu verification endpoint
    const verification = await verifyPayment(webhookData.tx_ref);

    if (!verification?.status) {
      console.error(`Danger: transaction with id: ${webhookData.tx_ref} not verified, webhook maybe compromised`);
       return res.status(403).send("valid signature but transaction is false");
    }

    // update payment record in DB
    const updated = await Payment.findOneAndUpdate(
      { tx_ref: webhookData.tx_ref },
      {
        status: webhookData.status,
	amount: webhookData.amount,
        authorization: webhookData.authorization,
        verifiedBy: 'webhook',
        verifiedAt: new Date(),
      },
      { upsert: true, new:true}
    );	  

    return res.status(200).send('WebHook processed successfully');

  } catch (error) {
    if (error?.response?.status) {
      console.log('Handled error status:', error.response.status);

      return res.status(error.response.status).json({
        success: false,
        message:
          error.response.data?.data?.message ||
          error.response.data?.message ||
          'Verification failed',
      });
    }

    console.log(error);
    res.status(500).send('Internal Server Error');
  }
}


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

