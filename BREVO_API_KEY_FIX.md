# Brevo API Key Issue - Diagnosis & Fix

## 🐛 **Problem Identified**

Your Brevo API key is being corrupted with extra characters:
```
❌ Corrupted: 'api-key: xsmtpsib-c6a5496e34a167cccc8009292dd5b025c9afb6da7efd1f434142f983e56eb45d-2ZdhWRBTN8spArvX\r\n' +
✅ Correct:   xsmtpsib-c6a5496e34a167cccc8009292dd5b025c9afb6da7efd1f434142f983e56eb45d-2ZdhWRBTN8spArvX
```

## 🔍 **Issues Found**
- **Extra prefix**: `'api-key: ` 
- **Extra suffix**: `\r\n' +`
- **Carriage return/newline**: `\r\n`
- **String concatenation**: `+` character

## ✅ **Fixes Applied**

### **1. Enhanced Email Service (`services/emailService.js`)**

**API Key Sanitization:**
```javascript
const API_KEY = process.env.BREVO_API_KEY?.trim(); // Remove whitespace/newlines
```

**Validation & Debug Logging:**
```javascript
// Detect corrupted API keys
if (!API_KEY || API_KEY.includes('\r') || API_KEY.includes('\n') || API_KEY.includes('+')) {
  console.error('❌ Invalid API key format detected');
  throw new Error('Invalid BREVO_API_KEY format');
}
```

**Enhanced Error Reporting:**
```javascript
console.log('🔑 Using API key (first 20 chars):', API_KEY.substring(0, 20) + '...');
```

### **2. Diagnostic Tools Created**

**Node.js Diagnostic Script (`diagnose-api-key.js`):**
```bash
node diagnose-api-key.js
```

**Bash Cleanup Script (`fix-api-key.sh`):**
```bash
bash fix-api-key.sh
```

## 🛠️ **How to Fix Your Environment Variable**

### **Option 1: Update .env file**
```bash
# Create or update .env file
echo "BREVO_API_KEY=xsmtpsib-c6a5496e34a167cccc8009292dd5b025c9afb6da7efd1f434142f983e56eb45d-2ZdhWRBTN8spArvX" > .env
```

### **Option 2: Set environment variable**
```bash
export BREVO_API_KEY="xsmtpsib-c6a5496e34a167cccc8009292dd5b025c9afb6da7efd1f434142f983e56eb45d-2ZdhWRBTN8spArvX"
```

### **Option 3: Windows Command Prompt**
```cmd
set BREVO_API_KEY=xsmtpsib-c6a5496e34a167cccc8009292dd5b025c9afb6da7efd1f434142f983e56eb45d-2ZdhWRBTN8spArvX
```

### **Option 4: Windows PowerShell**
```powershell
$env:BREVO_API_KEY="xsmtpsib-c6a5496e34a167cccc8009292dd5b025c9afb6da7efd1f434142f983e56eb45d-2ZdhWRBTN8spArvX"
```

## 🔧 **Verification Steps**

### **1. Run Diagnostic Script**
```bash
node diagnose-api-key.js
```

Expected output:
```
✅ Correct API key:
   Value: xsmtpsib-c6a5496e34a167cccc8009292dd5b025c9afb6da7efd1f434142f983e56eb45d-2ZdhWRBTN8spArvX
   Length: 83 characters

✅ API key is correctly formatted!
```

### **2. Test Email Service**
```bash
node -e "require('./services/emailService').sendEmail('test@example.com', 'Test User', 'Test Subject', null, '<p>Test email</p>').catch(console.error)"
```

### **3. Check Application Logs**
Look for these log messages when starting your app:
```
🔧 Email Service Configuration:
API_KEY length: 83
API_KEY starts with: xsmtpsib-c
✅ Email sent successfully
```

## 🚨 **Common Causes**

1. **Copy-paste errors** - Copying from browser/terminal with extra formatting
2. **IDE formatting** - Some editors add line breaks to long strings
3. **Shell escaping** - Incorrect quoting in shell commands
4. **File encoding** - Windows vs Unix line endings

## 🔒 **Security Best Practices**

1. **Never commit API keys** to version control
2. **Use .env files** and add `.env` to `.gitignore`
3. **Rotate API keys** regularly
4. **Use different keys** for development and production

## ✅ **Expected Behavior After Fix**

- ✅ **Clean API key** - No extra characters
- ✅ **Successful email sending** - Brevo API accepts requests
- ✅ **Clear logging** - Proper debug information
- ✅ **Error handling** - Meaningful error messages

Restart your application after fixing the environment variable! 🚀
