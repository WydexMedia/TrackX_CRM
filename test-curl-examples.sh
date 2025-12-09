#!/bin/bash

# Quick curl tests for Clerk setup
# Note: Full authentication testing requires browser (Clerk uses OAuth flows)

BASE_URL="http://localhost:3000"

echo "========================================="
echo "   Clerk Setup - Quick cURL Tests"
echo "========================================="
echo ""

echo "⚠️  IMPORTANT: Clerk authentication uses browser-based OAuth flows."
echo "   These tests verify endpoints are accessible, but full auth"
echo "   testing requires a browser."
echo ""

echo "=== Test 1: Public Login Page ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/login"
echo ""

echo "=== Test 2: Public Signup Page ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/signup"
echo ""

echo "=== Test 3: Protected API Route (Should be 401) ==="
echo "Testing /api/users without authentication..."
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/users" | head -5
echo ""

echo "=== Test 4: Protected API Route - Sales (Should be 401) ==="
echo "Testing /api/sales without authentication..."
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/sales" | head -5
echo ""

echo "========================================="
echo ""
echo "Expected Results:"
echo "  ✓ Login page: 200"
echo "  ✓ Signup page: 200"
echo "  ✓ /api/users: 401 (requires auth)"
echo "  ✓ /api/sales: 401 (requires auth)"
echo ""
echo "To test with authentication:"
echo "  1. Sign in through browser at $BASE_URL/login"
echo "  2. Open DevTools → Network tab"
echo "  3. Make a request, copy as cURL (includes cookies)"
echo ""
echo "Or use browser console:"
echo "  fetch('/api/users').then(r => r.json()).then(console.log)"
echo ""


