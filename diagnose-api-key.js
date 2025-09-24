#!/usr/bin/env node

/**
 * Brevo API Key Diagnostic Tool
 * Helps identify and fix API key formatting issues
 */

const correctApiKey =
  "xsmtpsib-c6a5496e34a167cccc8009292dd5b025c9afb6da7efd1f434142f983e56eb45d-2ZdhWRBTN8spArvX";

console.log("🔧 Brevo API Key Diagnostic Tool");
console.log("=================================\n");

// Check current environment variable
const currentApiKey = process.env.BREVO_API_KEY;

console.log("✅ Correct API key:");
console.log(`   Value: ${correctApiKey}`);
console.log(`   Length: ${correctApiKey.length} characters`);
console.log(`   Starts with: ${correctApiKey.substring(0, 15)}...`);
console.log(`   Ends with: ...${correctApiKey.substring(-15)}\n`);

if (currentApiKey) {
  console.log("🔍 Current BREVO_API_KEY from environment:");
  console.log(`   Value: "${currentApiKey}"`);
  console.log(`   Length: ${currentApiKey.length} characters`);
  console.log(`   Starts with: ${currentApiKey.substring(0, 15)}...`);
  console.log(`   Ends with: ...${currentApiKey.substring(-15)}`);

  // Check for problematic characters
  const issues = [];
  if (currentApiKey.includes("\r")) issues.push("carriage return (\\r)");
  if (currentApiKey.includes("\n")) issues.push("newline (\\n)");
  if (currentApiKey.includes("+")) issues.push("plus sign (+)");
  if (currentApiKey.includes("'")) issues.push("single quotes (')");
  if (currentApiKey.includes('"')) issues.push('double quotes (")');
  if (currentApiKey.includes(" ")) issues.push("spaces");

  if (issues.length > 0) {
    console.log("\n⚠️  Issues found:");
    issues.forEach(issue => console.log(`   - Contains ${issue}`));

    console.log("\n🛠️  Suggested fix:");
    const cleanedKey = currentApiKey.replace(/[\r\n\+\'\"\s]/g, "");
    console.log(`   Clean key: ${cleanedKey}`);

    if (cleanedKey === correctApiKey) {
      console.log("   ✅ Cleaned key matches expected value");
    } else {
      console.log("   ❌ Cleaned key does not match expected value");
      console.log("   Please verify your API key manually");
    }
  } else if (currentApiKey === correctApiKey) {
    console.log("\n✅ API key is correctly formatted!");
  } else {
    console.log("\n❌ API key does not match expected value");
    console.log("   Please verify your API key manually");
  }
} else {
  console.log("❌ BREVO_API_KEY not found in environment variables");
}

console.log("\n🛠️  How to fix:");
console.log("\n1. Update your .env file:");
console.log(`   BREVO_API_KEY=${correctApiKey}`);
console.log("\n2. Or set environment variable:");
console.log(`   export BREVO_API_KEY="${correctApiKey}"`);
console.log("\n3. Restart your application");

console.log("\n🔧 Test your email service:");
console.log(
  "   node -e \"require('./services/emailService').sendEmail('test@example.com', 'Test', 'Test', 'Test message', '<p>Test message</p>').catch(console.error)\""
);
