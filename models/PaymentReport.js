const mongoose = require('mongoose');

const PaymentReportSchema = new mongoose.Schema({
  email: String,
  tx_ref: String,
  status: String,
  message: String,	
});

module.exports = mongoose.model('PaymentReport', PaymentReportSchema);
