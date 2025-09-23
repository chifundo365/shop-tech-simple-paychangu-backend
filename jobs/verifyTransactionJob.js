const axios = require('axios');
const cron = require ('node-cron');
const Payment = require('../models/Payment.js');
const verifyPayment = require('../utils/verifyPayment');
const { sendEmail } = require("../services/emailService");
const { generatePaymentEmail } = require("../utils/emailTemplates");

const API_BASE = process.env.PAYCHANGU_API_BASE;
const SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;
const MAX_RETRIES = 5;


/**
 * Background job - checking and updating status of pending transaction
 */
const verifyTransactionJob = cron.schedule('*/30 * * * * *', async () => {
  console.log('Background job started checking pending transactions');

  try {
    const pendingPayments = await Payment.find({
      status: { $nin: ['success', 'failed'] },
      retries: { $lt: MAX_RETRIES }
    });

    for (const payment of pendingPayments) {
      try {
        const verification = await verifyPayment(payment.tx_ref);

	// update payment status on verified
        if (verification?.status === 'success') {
          payment.status = verification.status;
          payment.amount = verification.data.amount;
          payment.authorization = verification.data.authorization;
          payment.verifiedBy = 'background-job';
	  payment.verifiedAt = new Date();

	  // Send email on payment success
	  await sendEmail(
	    payment.email,
	    `${payment.first_name} ${payment.last_name}`,
            'PAYMENT STATUS  - PURCHASING PRODUCTS THROUGH SHOP TECH',
	    null,
	    generatePaymentEmail(
	      `${payment.first_name} ${payment.last_name}`,
	      payment.status,
	      payment.tx_ref,
	      payment.amount,
	      payment.metadata.shopName,
	      payment.metadata.products
	    )
	  );
        }

      } catch (error) {
        console.error(
          `Verification failed for tx_ref ${payment.tx_ref}:`,
          error?.response?.status || error.message
        );
      } finally {
        payment.retries += 1;

        //Mark as FAILED if max retries reached
        if (payment.retries >= MAX_RETRIES && payment.status !== 'success') {
          payment.status = 'failed';
          payment.verifiedBy = 'background-job';
          console.log(`Payment ${payment.tx_ref} marked as FAILED after ${MAX_RETRIES} retries`);

	  // Send an Email on a FAILED payment
	   await sendEmail(
	    payment.email,
	    `${payment.first_name} ${payment.last_name}`,
            'PAYMENT STATUS  - PURCHASING PRODUCTS THROUGH SHOP TECH',
	    null,
	    generatePaymentEmail(
	      `${payment.first_name} ${payment.last_name}`,
	      payment.status,
	      payment.tx_ref,
              payment.amount,
	      payment.metadata.shopName,
	      payment.metadata.products
	    )
	  )

        }

        await payment.save();
      }
    }

  } catch (error) {
    console.error('Error in Background Job fetching pending payments:', error);
  }

  console.log('Background job finished');
});

module.exports = verifyTransactionJob;
