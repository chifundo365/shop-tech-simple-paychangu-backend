const mongoose = require('mongoose');

const AuthorizationSchema = new mongoose.Schema({
  channel: { type: String },
  card_number: { type: String },
  expiry: { type: String },
  brand: { type: String },
  provider: { type: String, default: null },
  mobile_number: { type: String, default: null },
  completed_at: { type: Date }
});


const paymentSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: String,
  amount: Number,
  currency: String,	
  phone: Number,
  status: { 
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
  },
  tx_ref: String,
  retries: { type: Number, default: 0 },
  verifiedAt: Date,   	
  verifiedBy: {
    type: String,
    enum: ['verify-payment-endpoint', 'webhook', 'background-job'],
    default: null	  
  },
  authorization: AuthorizationSchema,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
