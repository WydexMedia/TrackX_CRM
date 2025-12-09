#!/bin/bash

# Test script for Clerk authentication endpoints
# Usage: ./scripts/test-clerk-auth.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "========================================="
echo "   Clerk Authentication Test Script"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing Public Endpoints ===${NC}"
echo ""

# Test login page
echo -e "${YELLOW}Testing /login page...${NC}"
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/login")
if [ "$LOGIN_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Login page is accessible (Status: $LOGIN_STATUS)${NC}"
else
    echo -e "${RED}✗ Login page failed (Status: $LOGIN_STATUS)${NC}"
fi

# Test signup page
echo -e "${YELLOW}Testing /signup page...${NC}"
SIGNUP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/signup")
if [ "$SIGNUP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Signup page is accessible (Status: $SIGNUP_STATUS)${NC}"
else
    echo -e "${RED}✗ Signup page failed (Status: $SIGNUP_STATUS)${NC}"
fi

echo ""
echo -e "${BLUE}=== Testing Protected Endpoints (Should Require Auth) ===${NC}"
echo ""

# Test protected API route without auth
echo -e "${YELLOW}Testing /api/users without authentication...${NC}"
USERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/users")
if [ "$USERS_STATUS" = "401" ]; then
    echo -e "${GREEN}✓ Protected endpoint correctly requires auth (Status: $USERS_STATUS)${NC}"
elif [ "$USERS_STATUS" = "200" ]; then
    echo -e "${YELLOW}⚠ Endpoint returned 200 (might have valid session cookie)${NC}"
else
    echo -e "${YELLOW}⚠ Unexpected status: $USERS_STATUS${NC}"
fi

# Test another protected route
echo -e "${YELLOW}Testing /api/sales without authentication...${NC}"
SALES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/sales")
if [ "$SALES_STATUS" = "401" ]; then
    echo -e "${GREEN}✓ Protected endpoint correctly requires auth (Status: $SALES_STATUS)${NC}"
elif [ "$SALES_STATUS" = "200" ]; then
    echo -e "${YELLOW}⚠ Endpoint returned 200 (might have valid session cookie)${NC}"
else
    echo -e "${YELLOW}⚠ Unexpected status: $SALES_STATUS${NC}"
fi

echo ""
echo -e "${BLUE}=== Environment Check ===${NC}"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local file exists${NC}"
    
    # Check for Clerk keys (without showing values)
    if grep -q "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" .env.local; then
        echo -e "${GREEN}✓ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set${NC}"
    else
        echo -e "${RED}✗ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing${NC}"
    fi
    
    if grep -q "CLERK_SECRET_KEY" .env.local; then
        echo -e "${GREEN}✓ CLERK_SECRET_KEY is set${NC}"
    else
        echo -e "${RED}✗ CLERK_SECRET_KEY is missing${NC}"
    fi
else
    echo -e "${RED}✗ .env.local file not found${NC}"
    echo -e "${YELLOW}  Create .env.local with Clerk keys:${NC}"
    echo -e "${YELLOW}  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...${NC}"
    echo -e "${YELLOW}  CLERK_SECRET_KEY=sk_test_...${NC}"
fi

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Browser Testing Instructions${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${YELLOW}Clerk authentication cannot be fully tested with curl${NC}"
echo -e "${YELLOW}because it uses browser-based OAuth flows and cookies.${NC}"
echo ""
echo -e "${YELLOW}To test login/signup:${NC}"
echo -e "1. Start dev server: ${GREEN}npm run dev${NC}"
echo -e "2. Open browser: ${GREEN}$BASE_URL/login${NC}"
echo -e "3. Test sign up flow"
echo -e "4. Test sign in flow"
echo -e "5. Verify protected pages work"
echo ""
echo -e "${YELLOW}To test with authenticated requests:${NC}"
echo -e "1. Sign in through browser"
echo -e "2. Open browser DevTools → Network tab"
echo -e "3. Copy cookies from a request"
echo -e "4. Use cookies in curl:"
echo -e "   ${GREEN}curl -H \"Cookie: __session=...\" $BASE_URL/api/users${NC}"
echo ""


