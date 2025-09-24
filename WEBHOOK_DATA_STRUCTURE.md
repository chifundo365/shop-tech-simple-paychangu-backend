# PayChangu Webhook Data Structure - Updated Implementation

## 🔍 **Webhook vs Verification Response Differences**

PayChangu sends different data structures for webhooks vs verification endpoints:

### **Webhook Data Structure (Direct Fields)**
```javascript
{
  event_type: 'checkout.payment',
  first_name: 'chifundo',
  last_name: 'biziweck',
  email: 'chifundobiziweck@gmail.com',
  currency: 'MWK',
  amount: 1398600,
  charge: 41958,                    // ← Different field name
  amount_split: {                   // ← Webhook-specific field
    fee_paid_by_customer: 0,
    fee_paid_by_merchant: 41958,
    total_amount_paid_by_customer: 1398600,
    amount_received_by_merchant: 1356642
  },
  total_amount_paid: 1398600,       // ← Webhook-specific
  mode: 'test',
  type: 'API Payment (Checkout)',
  status: 'success',                // ← Direct access
  reference: '68530913263',
  tx_ref: 'fa945eb2-4896-4030-9e24-783cc956ca68',
  authorization: {
    channel: 'Test',
    card_details: null,
    bank_payment_details: null,
    mobile_money: null,
    completed_at: '2025-09-24T05:17:45.000000Z'
  },
  customer: {
    customer_ref: 'cs_e4442133d5a27bc',
    email: 'chifundobiziweck@gmail.com',
    first_name: null,
    last_name: null,
    phone: null
  }
}
```

### **Verification Response Structure (Nested in data)**
```javascript
{
  status: 'success',
  message: 'Payment details retrieved successfully.',
  data: {                           // ← Nested structure
    status: 'success',              // ← Nested access
    amount: 418600,
    charges: 12558,               // ← Different field name
    tx_ref: '111bd721-856e-4acd-986c-a519a0ff288c',
    // ... other fields
  }
}
```

## ✅ **Updated Implementation**

### **1. Webhook Handler Updates**

**Enhanced Webhook Processing:**
```javascript
// Direct field access for webhook data
const webhookStatus = webhookData.status;        // Not webhookData.data.status
const webhookAmount = webhookData.amount;
const webhookCharge = webhookData.charge;        // Not 'charges'

// Enhanced logging
console.log(`🔍 Webhook payment details:`, {
  status: webhookData.status,
  amount: webhookData.amount,
  charge: webhookData.charge,
  merchantAmount: webhookData.amount_split?.amount_received_by_merchant
});
```

**Cross-Validation:**
```javascript
// Compare webhook vs verification response
if (txData.status !== webhookStatus) {
  // Webhook compromised
}

if (Math.abs(txData.amount - webhookData.amount) > 1) {
  // Amount mismatch
}
```

### **2. Enhanced Data Storage**

**Unified Field Handling:**
```javascript
// Handle both webhook and verification field names
if (updateData.charges || updateData.charge) {
  updateFields['metadata.charges'] = updateData.charges || updateData.charge;
}

// Store webhook-specific fields
if (updateData.amount_split) {
  updateFields['metadata.amount_split'] = updateData.amount_split;
}
if (updateData.total_amount_paid) {
  updateFields['metadata.total_amount_paid'] = updateData.total_amount_paid;
}
```

### **3. Enhanced Email Content**

**Merchant Amount Display:**
```html
Amount Paid: MWK 1,398,600
Transaction Fees: MWK 41,958
Amount to Merchant: MWK 1,356,642  ← NEW (from webhook)
```

## 📊 **Field Mapping Comparison**

| Data Point | Webhook Field | Verification Field | Storage Location |
|------------|---------------|-------------------|------------------|
| Payment Status | `status` | `data.status` | `payment.status` |
| Payment Amount | `amount` | `data.amount` | `payment.amount` |
| Transaction Fees | `charge` | `data.charges` | `metadata.charges` |
| PayChangu Reference | `reference` | `data.reference` | `metadata.reference` |
| Payment Method | `authorization.channel` | `data.authorization.channel` | `authorization.channel` |
| Merchant Amount | `amount_split.amount_received_by_merchant` | N/A | `metadata.amount_split` |
| Customer Amount | `amount_split.total_amount_paid_by_customer` | N/A | `metadata.amount_split` |

## 🚀 **Webhook-Specific Enhancements**

### **1. Amount Split Tracking**
```javascript
// From webhook data
amount_split: {
  fee_paid_by_customer: 0,              // Customer doesn't pay fees
  fee_paid_by_merchant: 41958,          // Merchant pays fees
  total_amount_paid_by_customer: 1398600, // Total customer paid
  amount_received_by_merchant: 1356642   // Net amount to merchant
}
```

### **2. Enhanced Validation**
- ✅ **Status comparison** - Webhook vs verification
- ✅ **Amount validation** - Cross-check amounts
- ✅ **Signature verification** - Security validation
- ✅ **Reference matching** - Transaction reference validation

### **3. Comprehensive Logging**
```javascript
🔍 Webhook payment details for fa945eb2-4896-4030-9e24-783cc956ca68: {
  status: 'success',
  amount: 1398600,
  charge: 41958,
  currency: 'MWK',
  reference: '68530913263',
  authChannel: 'Test',
  merchantAmount: 1356642
}

🔍 Webhook vs Verification comparison: {
  webhookStatus: 'success',
  verificationStatus: 'success',
  webhookAmount: 1398600,
  verificationAmount: 1398600,
  webhookCharge: 41958,
  verificationCharges: 41958
}
```

## 🛡️ **Security Enhancements**

### **Multi-Level Validation**
1. **Signature Validation** - Verify webhook authenticity
2. **Database Lookup** - Ensure payment record exists  
3. **External Verification** - Cross-check with PayChangu API
4. **Status Comparison** - Webhook vs verification status match
5. **Amount Validation** - Ensure amounts match within tolerance

## 📧 **Enhanced Email Experience**

**Sample Enhanced Email:**
```
Hi chifundo biziweck,
Your payment was successful! 🎉

Amount Paid: MWK 1,398,600
Transaction Fees: MWK 41,958
Amount to Merchant: MWK 1,356,642
Payment Reference: 68530913263
Payment Method: Test
Transaction Reference: fa945eb2-4896-4030-9e24-783cc956ca68
```

## ✅ **Benefits**

- ✅ **Accurate Webhook Processing** - Handles direct field structure
- ✅ **Enhanced Data Capture** - Stores webhook-specific fields
- ✅ **Cross-Validation** - Webhook vs verification comparison
- ✅ **Better Transparency** - Shows merchant net amount
- ✅ **Security** - Multiple validation layers
- ✅ **Debugging** - Comprehensive logging

The system now properly handles both webhook and verification response structures with enhanced validation and transparency! 🎯
