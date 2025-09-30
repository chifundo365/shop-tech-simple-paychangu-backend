const axios = require('axios');
const cron = require('node-cron');
const Payment = require('../models/Payment.js');
const verifyPayment = require('../utils/verifyPayment');
const { sendEmail } = require("../services/emailService");
const { generatePaymentEmail } = require("../utils/emailTemplates");

const API_BASE = process.env.PAYCHANGU_API_BASE;
const SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;

const verifyTransactionJob = cron.schedule('* * * * *', async () => {
  console.log('Background job started checking pending transactions');

  try {
    const currentTime = new Date();
    const expiredPayments = await Payment.find({
      status: { $nin: ['success', 'failed'] },
      expired_at: { $lte: currentTime }
    });

    console.log(`Found ${expiredPayments.length} expired payments to mark as failed`);

    for (const expiredPayment of expiredPayments) {
      try {
        expiredPayment.status = 'failed';
        expiredPayment.verifiedBy = 'background-job';
        expiredPayment.verifiedAt = new Date();

        await sendEmail(
          expiredPayment.email,
          `${expiredPayment.first_name} ${expiredPayment.last_name}`,
          'Your ShopTech Order: Payment Expired',
          null,
          generatePaymentEmail(
            `${expiredPayment.first_name} ${expiredPayment.last_name}`,
            'failed',
            expiredPayment.tx_ref,
            expiredPayment.amount,
            expiredPayment.metadata.shopName,
            expiredPayment.metadata.products,
            {
              currency: expiredPayment.currency
            }
          )
        );

        await expiredPayment.save();
        console.log(`Expired payment marked as failed: ${expiredPayment.tx_ref}`);
      } catch (error) {
        console.error(`Error processing expired payment ${expiredPayment.tx_ref}:`, error.message);
      }
    }

    const pendingPayments = await Payment.find({
      status: { $nin: ['success', 'failed'] },
      $or: [
        { expired_at: { $gt: currentTime } },
        { expired_at: null }
      ]
    });

    for (const payment of pendingPayments) {
      try {
        const verification = await verifyPayment(payment.tx_ref);

        if (verification?.status === 'success') {
          payment.status = verification.data.status;
          payment.amount = verification.data.amount;
          payment.authorization = verification.data.authorization;
          payment.verifiedBy = 'background-job';
          payment.verifiedAt = new Date();

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
              payment.metadata.products,
              {
                currency: payment.currency
              }
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
              payment.metadata.products,
              {
                currency: payment.currency
              }
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

