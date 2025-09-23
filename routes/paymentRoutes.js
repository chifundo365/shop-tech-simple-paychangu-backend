const express = require('express');
const {
  initiatePayment,
  verifyPayment,
  webhook,
  paymentReport,
} = require('../controllers/paymentController');
const router = express.Router();
const jsonParser = express.json();

// Initiate payment
router.post('/make-payment', jsonParser, initiatePayment);

// Verify Payment
router.post('/verify-payment', jsonParser, verifyPayment);

// Paychangu Webhook - server to server
router.post('/webhook', express.raw({type:'application/json'}), webhook)
 
// paymentReport
router.post('/submit-payment-report', jsonParser, paymentReport);
module.exports = router;

