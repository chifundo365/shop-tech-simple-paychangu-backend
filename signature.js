const crypto = require('crypto');

// Replace with your actual webhook secret key from PayChangu
const WEBHOOK_SECRET = "your_webhook_secret_key";

const payload = JSON.stringify({
  event_type: "api.charge.payment",
  currency: "MWK",
  amount: 1000,
  charge: "20",
  mode: "test",
  type: "Direct API Payment",
  status: "success",
  charge_id: "5d676fg",
  reference: "71308131545",
  authorization: {
    channel: "Mobile Bank Transfer",
    card_details: null,
    bank_payment_details: {
      payer_bank_uuid: "82310dd1-ec9b-4fe7-a32c-2f262ef08681",
      payer_bank: "National Bank of Malawi",
      payer_account_number: "10010000",
      payer_account_name: "Jonathan Manda"
    },
    mobile_money: null,
    completed_at: "2025-01-15T19:53:18.000000Z"
  },
  created_at: "2025-01-15T19:53:18.000000Z",
  updated_at: "2025-01-15T19:53:18.000000Z"
});

// Generate HMAC SHA256 signature
const signature = crypto
  .createHmac('sha256', 'd79a0831e23e2c194108c7474ed7c27479f55e0040e7569feba85ff302e352d1a61e480e3e172798e0022c4731f5277f600bff600b6e26c8de3e6c78f66f71fb')
  .update(payload)
  .digest('hex');

console.log("Payload:");
console.log(payload);
console.log("\nSignature:");
console.log(signature);

// Print ready-to-use curl
console.log("\nCopy this curl into your terminal:\n");
console.log(`curl -X POST https://7c268bab8d19.ngrok-free.app/api/webhook \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "signature: ${signature}" \\`);
console.log(`  -d '${payload}'`);

