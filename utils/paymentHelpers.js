const crypto = require('crypto');
const Payment = require('../models/Payment');
const verifyPayment = require('./verifyPayment');
const { sendEmail } = require('../services/emailService');
const { generatePaymentEmail } = require('./emailTemplates');

const WEBHOOK_SECRET_KEY = process.env.PAYCHANGU_WEBHOOK_SECRET_KEY;

function validateWebhookSignature(signature, payload) {
  if (!signature) {
    return false;
  }

  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET_KEY)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

async function updatePaymentRecord(txRef, updateData, verifiedBy = null) {
  const updateFields = {
    status: updateData.status,
    amount: updateData.amount,
    currency: updateData.currency,
    authorization: {
      channel: updateData.authorization?.channel,
      card_number: updateData.authorization?.card_number,
      expiry: updateData.authorization?.expiry,
      brand: updateData.authorization?.brand,
      provider: updateData.authorization?.provider,
      mobile_number: updateData.authorization?.mobile_number,
      completed_at: updateData.authorization?.completed_at ? new Date(updateData.authorization.completed_at) : null
    }
  };

  if (updateData.status === 'success' && verifiedBy) {
    updateFields.verifiedBy = verifiedBy;
    updateFields.verifiedAt = new Date();
  }

  if (updateData.charges || updateData.charge) {
    updateFields['metadata.charges'] = updateData.charges || updateData.charge;
  }
  if (updateData.reference) {
    updateFields['metadata.reference'] = updateData.reference;
  }
  if (updateData.number_of_attempts) {
    updateFields['metadata.number_of_attempts'] = updateData.number_of_attempts;
  }
  if (updateData.amount_split) {
    updateFields['metadata.amount_split'] = updateData.amount_split;
  }
  if (updateData.total_amount_paid) {
    updateFields['metadata.total_amount_paid'] = updateData.total_amount_paid;
  }
  if (updateData.event_type) {
    updateFields['metadata.event_type'] = updateData.event_type;
  }

  return await Payment.findOneAndUpdate(
    { tx_ref: txRef },
    updateFields,
    { new: true }
  );
}

async function sendPaymentStatusEmail(payment, status) {
  try {
    console.log(`Attempting to send email for payment ${payment.tx_ref} with status: ${status}`);
    
    if (payment.emailSent && payment.emailSent[status]) {
      console.log(`Email already sent for status ${status} on payment ${payment.tx_ref} - Skipping duplicate`);
      return false;
    }

    console.log(`Preparing email for ${payment.email} (${payment.first_name} ${payment.last_name})`);
    
    const fullName = `${payment.first_name} ${payment.last_name}`;
    const emailBody = generatePaymentEmail(
      fullName,
      status,
      payment.tx_ref,
      payment.amount,
      payment.metadata?.shopName,
      payment.metadata?.products,
      {
        charges: payment.metadata?.charges,
        reference: payment.metadata?.reference,
        authorization: payment.authorization,
        amount_split: payment.metadata?.amount_split
      }
    );

    console.log(`Sending payment ${status} email to ${payment.email} for transaction ${payment.tx_ref}`);
    
    await sendEmail(
      payment.email,
      fullName,
      'Your ShopTech Order: Payment Status Update',
      null,
      emailBody
    );

    console.log(`Email delivery initiated successfully for ${payment.email}`);

    await Payment.findOneAndUpdate(
      { tx_ref: payment.tx_ref },
      {
        [`emailSent.${status}`]: true,
        [`emailSentAt.${status}`]: new Date()
      }
    );

    console.log(`Email sent successfully for status '${status}' on payment ${payment.tx_ref} to ${payment.email}`);
    return true;
  } catch (error) {
    console.error(`Failed to send payment status email for ${payment.tx_ref}:`, error);
    return false;
  }
}

async function verifyAndUpdatePayment(txRef, existingPayment, verifiedBy, shouldSendEmail = true) {
  try {
    const verification = await verifyPayment(txRef);
    
    if (!verification?.data) {
      throw new Error('Verification failed - no data returned');
    }

    const txData = verification.data;
    const oldStatus = existingPayment.status;

    console.log(`Verification response for ${txRef}:`, {
      apiStatus: verification.status,
      apiMessage: verification.message,
      paymentStatus: txData.status,
      paymentAmount: txData.amount,
      currency: txData.currency,
      charges: txData.charges,
      reference: txData.reference,
      attempts: txData.number_of_attempts,
      authChannel: txData.authorization?.channel,
      customerEmail: txData.customer?.email
    });

    if (txData.status !== existingPayment.status) {
      console.log(`Payment status changed from '${existingPayment.status}' to '${txData.status}' for tx_ref: ${txRef}`);
      
      const updatedPayment = await updatePaymentRecord(txRef, txData, verifiedBy);
      
      if (shouldSendEmail && (txData.status === 'success' || txData.status === 'failed')) {
          console.log(`Triggering email notification for payment ${txRef} - Status: ${txData.status}`);
        await sendPaymentStatusEmail(updatedPayment, txData.status);
      } else if (shouldSendEmail) {
        console.log(`Email not triggered for payment ${txRef} - Status '${txData.status}' doesn't require notification`);
      } else {
        console.log(`Email sending disabled for payment ${txRef} verification`);
      }
      
      return { 
        success: true, 
        payment: updatedPayment, 
        data: txData,
        statusChanged: true,
        oldStatus,
        newStatus: txData.status
      };
    }

    console.log(`Payment status unchanged for tx_ref: ${txRef} (Status: ${txData.status})`);
    return { 
      success: true, 
      payment: existingPayment, 
      data: txData,
      statusChanged: false,
      oldStatus,
      newStatus: txData.status
    };
  } catch (error) {
    console.log(`VERIFICATION ERROR for payment ${txRef}:`, error.response?.data || error.message);

    
    if (error?.response?.status && existingPayment) {
      const errorResponseData = error.response.data || {};
      const paymentData = errorResponseData.data || {};
      const errorData = {
        status: paymentData.status || errorResponseData.status || 'failed',
        amount: paymentData.amount || errorResponseData.amount || existingPayment.amount,
        tx_ref: paymentData.tx_ref || errorResponseData.tx_ref || existingPayment.tx_ref
      };
      
      const updatedPayment = await updatePaymentRecord(
        txRef,
        {
          status: errorData.status,
          amount: errorData.amount,
          authorization: existingPayment.authorization
        },
        verifiedBy
      );
      
      if (shouldSendEmail && updatedPayment.status === 'failed' && existingPayment.status !== 'failed') {
        console.log(`Triggering failure email notification for payment ${txRef} due to verification error`);
        await sendPaymentStatusEmail(updatedPayment, 'failed');
      } else if (shouldSendEmail && updatedPayment.status === 'failed') {
        console.log(`Payment ${txRef} already marked as failed - No email needed`);
      }
      
      return {
        success: false,
        payment: updatedPayment,
        error: {
          status: error.response.status,
          message: error.response.data?.message || errorData.message || 'Verification failed'
        }
      };
    }
    
    throw error;
  }
}

function validatePaymentInitiation(data) {
  const requiredFields = ['first_name', 'last_name', 'email', 'phone', 'amount', 'currency'];
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    return {
      isValid: false,
      message: `Missing required fields: ${missingFields.join(', ')}`
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return {
      isValid: false,
      message: 'Invalid email format'
    };
  }
  if (isNaN(data.amount) || data.amount <= 0) {
    return {
      isValid: false,
      message: 'Amount must be a positive number'
    };
  }

  return { isValid: true };
}

function validatePaymentReport(data) {
  const requiredFields = ['tx_ref', 'email', 'message', 'status'];
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    return {
      isValid: false,
      message: `Missing required fields: ${missingFields.join(', ')}`
    };
  }

  return { isValid: true };
}

module.exports = {
  validateWebhookSignature,
  updatePaymentRecord,
  sendPaymentStatusEmail,
  verifyAndUpdatePayment,
  validatePaymentInitiation,
  validatePaymentReport
};
