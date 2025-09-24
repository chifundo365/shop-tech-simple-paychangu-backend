#!/bin/bash

# Fix BREVO API Key Environment Variable
# This script helps clean up malformed API keys

echo "🔧 Brevo API Key Cleanup Utility"
echo "================================="

# Your correct API key
CORRECT_API_KEY="xsmtpsib-c6a5496e34a167cccc8009292dd5b025c9afb6da7efd1f434142f983e56eb45d-2ZdhWRBTN8spArvX"

echo "✅ Correct API key: $CORRECT_API_KEY"
echo "📏 Length: ${#CORRECT_API_KEY} characters"

# Check current environment variable
if [ -n "$BREVO_API_KEY" ]; then
    echo ""
    echo "🔍 Current BREVO_API_KEY in environment:"
    echo "Value: '$BREVO_API_KEY'"
    echo "Length: ${#BREVO_API_KEY} characters"
    
    # Check for problematic characters
    if [[ "$BREVO_API_KEY" == *$'\r'* ]]; then
        echo "⚠️  Contains carriage return (\\r)"
    fi
    if [[ "$BREVO_API_KEY" == *$'\n'* ]]; then
        echo "⚠️  Contains newline (\\n)"
    fi
    if [[ "$BREVO_API_KEY" == *"+"* ]]; then
        echo "⚠️  Contains plus sign (+)"
    fi
    if [[ "$BREVO_API_KEY" == *"'"* ]]; then
        echo "⚠️  Contains single quotes (')"
    fi
else
    echo ""
    echo "❌ BREVO_API_KEY not found in environment"
fi

echo ""
echo "🛠️  To fix your environment variable:"
echo ""
echo "1. For current session:"
echo "   export BREVO_API_KEY=\"$CORRECT_API_KEY\""
echo ""
echo "2. For .env file:"
echo "   BREVO_API_KEY=$CORRECT_API_KEY"
echo ""
echo "3. Restart your application after updating"
echo ""
echo "🔍 Validation:"
echo "   - Length should be: ${#CORRECT_API_KEY} characters"
echo "   - Should start with: ${CORRECT_API_KEY:0:10}"
echo "   - Should end with: ${CORRECT_API_KEY: -10}"
