const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: String,
  amount: Number,
  status: { type: String, default: 'PENDING' },
  transaction_id: String,
  tx_ref: String,
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
