#!/bin/bash
set -e

# ==============================================================================
# Decision Intelligence Production Smoke Test
# ==============================================================================
# This script performs verification on the live production service at di.glassx.ai
# to ensure the Nginx proxy, Next.js app, and backend are fully operational.
# ==============================================================================

DOMAIN="di.glassx.ai"
HEALTH_URL="https://$DOMAIN/api/health"

echo "========================================="
echo "🔍 Starting Production Smoke Test for $DOMAIN"
echo "========================================="

# 1. Check if curl is available
if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl is required but not installed."
    exit 1
fi

# 2. Check DNS Resolution
echo "🌐 Checking DNS resolution for $DOMAIN..."
if ! host "$DOMAIN" > /dev/null 2>&1 && ! nslookup "$DOMAIN" > /dev/null 2>&1 && ! ping -c 1 "$DOMAIN" > /dev/null 2>&1; then
    echo "⚠️  Warning: DNS resolution test was inconclusive. Continuing to HTTP test..."
else
    echo "✅ DNS resolves successfully."
fi

# 3. Test HTTP to HTTPS redirection
echo "🔒 Verifying HTTP to HTTPS redirection..."
REDIRECT_URL=$(curl -s -I "http://$DOMAIN" | grep -i "location:" | awk '{print $2}' | tr -d '\r\n')
if [[ "$REDIRECT_URL" == "https://$DOMAIN"* ]]; then
    echo "✅ HTTP successfully redirects to: $REDIRECT_URL"
else
    echo "⚠️  HTTP redirect check returned: '${REDIRECT_URL}' (Ensure Nginx is running and proxying)"
fi

# 4. Check Health Check Endpoint
echo "📞 Querying Health Check Endpoint: $HEALTH_URL"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ Success: Received HTTP status 200 OK"
else
    echo "❌ Error: Health check failed with status code: $HTTP_STATUS"
    exit 1
fi

# 5. Output Payload
echo "📋 Health check response payload:"
RESPONSE_PAYLOAD=$(curl -s "$HEALTH_URL")
if command -v json_pp &> /dev/null; then
    echo "$RESPONSE_PAYLOAD" | json_pp
elif command -v python3 &> /dev/null; then
    echo "$RESPONSE_PAYLOAD" | python3 -m json.tool
else
    echo "$RESPONSE_PAYLOAD"
fi

echo "========================================="
echo "🎉 Production Smoke Test Passed Successfully!"
echo "========================================="
