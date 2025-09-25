const express = require("express");
const {
  initiatePayment,
  verifyPayment,
  webhook,
  paymentReport
} = require("../controllers/paymentController");
const router = express.Router();
const jsonParser = express.json();

router.post("/make-payment", jsonParser, initiatePayment);
router.post("/verify-payment", jsonParser, verifyPayment);
router.post("/webhook", express.raw({ type: "application/json" }), webhook);
router.post("/submit-payment-report", jsonParser, paymentReport);
module.exports = router;
