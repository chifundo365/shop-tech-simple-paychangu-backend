require('dotenv').config();
const axios = require('axios');
const { uuid } = require('uuidv4');
const Payment = require('../models/Payment');


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
  const { first_name, last_name, email, phone, amount } = req.body;
  const reference = uuid();

	console.log(process.env.PAYCHANGU_API_BASE)

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
        currency: 'MWK',
	tx_ref: reference,
        callback_url: CALLBACK_URL,
	return_url: RETURN_URL,
	customization: {
          title: "Products Purchase Payment",
          description: "Payment for products purchased on shop-tech",
	},	
        metadata: {
	  reference,
	  campain: "50% off",
	},
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
      transaction_id: reference,
      tx_ref: txRef,
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

  try {
    const response  = await axios.get(
      `${API_BASE}/verify-payment/${tx_ref}`,
      {
        headers: {
	  'Content-Type': 'application/json',
          'Authorization': `Bearer ${SECRET_KEY}`,		
	},

      }
    );

    const verification = response.data;	  

    if (!verification || verification.status !== 'success') {
      return res.status(400).json({ success:false,  message: 'Verification failed' });
    }

    const txData = verification.data;

    // Update payment record in database
    const updated = await Payment.findOneAndUpdate(
      { tx_ref },
      {
        status: txData.status,
        amount: txData.amount,
      },
      { upsert: true, new: true }
    );

    if (!updated) {
      res.status(400).json({ success:false, message: `Transaction with id ${tx_ref} not found in the system` })
    }
    console.log("Verified");
    res.status(200).json({ success:true, message: `Payment with Transaction id ${tx_ref} is succesful`, data: txData });
  } catch (error) {
    console.error('Payment Verification Failed:', error?.response?.data || error.message);
    res.status(500).json({ sucess:true, message: "Server-Error - Payment Verification failed" });
  }
};
