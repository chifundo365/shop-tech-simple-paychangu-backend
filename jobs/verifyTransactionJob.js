const axios = require('axios');
const cron = require('node-cron');
const Payment = require('../models/Payment.js');
const verifyPayment = require('../utils/verifyPayment');
const { sendEmail } = require("../services/emailService");
const { generatePaymentEmail } = require("../utils/emailTemplates");

const API_BASE = process.env.PAYCHANGU_API_BASE;
const SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;

/**
 * Background job - checking and updating status of pending transaction
 */
const verifyTransactionJob = cron.schedule('0 * * * *', async () => {
  console.log('Background job started checking pending transactions');

  try {
    const pendingPayments = await Payment.find({
      status: { $nin: ['success', 'failed'] }
    });

    for (const payment of pendingPayments) {
      try {
        const verification = await verifyPayment(payment.tx_ref);

        // update payment status on verified
        if (verification?.status === 'success') {
          payment.status = verification.data.status;
          payment.amount = verification.data.amount;
          payment.authorization = verification.data.authorization;
          payment.verifiedBy = 'background-job';
          payment.verifiedAt = new Date();

          // Send html based email on payment success with full info.
          await sendEmail(
            payment.email,
            `${payment.first_name} ${payment.last_name}`,
            'PAYMENT STATUS  - PURCHASING PRODUCTS THROUGH SHOP TECH',
            null,
            generatePaymentEmail(
              `${payment.first_name} ${payment.last_name}`,
              verification.data.status,
              verification.data.tx_ref,
              verification.data.amount,
              payment.metadata.shopName,
              payment.metadata.products
            )
          );
        }

      } catch (error) {
        if (error?.response?.data?.status === 'failed') {
          console.log('Payment failed, tx_ref: ', payment.tx_ref);
          payment.status = error.response.data.data.status;
          payment.amount = error.response.data.data.amount;
          payment.verifiedBy = 'background-job';
          payment.verifiedAt = new Date();

          // Send email notification for failed payment
          await sendEmail(
            payment.email,
            `${payment.first_name} ${payment.last_name}`,
            'Your ShopTech Order: Payment Status Update',
            null,
            generatePaymentEmail(
              `${payment.first_name} ${payment.last_name}`,
              'failed',
              payment.tx_ref,
              payment.amount,
              payment.metadata.shopName,
              payment.metadata.products
            )
          );
          
          console.log(`Failed payment email sent to ${payment.email} for tx_ref: ${payment.tx_ref}`);
        }
      }

      await payment.save();
    }

  } catch (error) {
    console.error('Error in Background Job fetching pending payments:', error);
  }

  console.log('Background job finished');
});

module.exports = verifyTransactionJob;

