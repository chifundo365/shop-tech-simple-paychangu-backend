const express = require('express');
const {
  initiatePayment,
  verifyPayment,
} = require('../controllers/paymentController');
const router = express.Router();


// Initiate payment
router.post('/make-payment', initiatePayment);

// Verify Payment
router.post('/verify-payment', verifyPayment);
 

module.exports = router;

