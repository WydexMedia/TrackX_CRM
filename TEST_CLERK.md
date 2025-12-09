# Testing Clerk Authentication

## Quick Test Scripts

### 1. Automated Test Script (Node.js)

```bash
# Make sure you have .env.local with Clerk keys
node scripts/test-clerk-setup.js
```

### 2. Shell Script Test

```bash
chmod +x scripts/test-clerk-auth.sh
./scripts/test-clerk-auth.sh
```

## Manual Browser Testing

Since Clerk uses browser-based OAuth flows, you **must test login/signup in a browser**.

### Step 1: Start Dev Server

```bash
cd trackx
npm run dev
```

### Step 2: Test Sign Up

1. Open browser: `http://localhost:3000/signup`
2. Fill in the signup form
3. Complete Clerk's verification (email/SMS)
4. You should be redirected after successful signup

### Step 3: Test Sign In

1. Go to: `http://localhost:3000/login`
2. Enter your credentials
3. Complete Clerk's authentication flow
4. You should be redirected to your dashboard

### Step 4: Test Protected Routes

1. After signing in, try accessing:
   - `http://localhost:3000/dashboard`
   - `http://localhost:3000/team-leader`
   - Any protected API routes should work

### Step 5: Test Sign Out

1. Use Clerk's `<UserButton />` component (should appear if you add it to your layout)
2. Or use `useClerk().signOut()` programmatically
3. Verify you're redirected to login

## Testing API Routes with Authentication

### Option 1: Browser DevTools

1. Sign in through browser
2. Open DevTools → Network tab
3. Make a request to a protected API (e.g., `/api/users`)
4. Copy the request as cURL from Network tab
5. The cookies will be included automatically

### Option 2: Copy Cookies Manually

1. Sign in through browser
2. Open DevTools → Application → Cookies
3. Find Clerk session cookies (usually `__session` or similar)
4. Use in curl:

```bash
curl -H "Cookie: __session=your_session_cookie_here" \
     http://localhost:3000/api/users
```

### Option 3: Use Browser Console

```javascript
// In browser console after signing in
fetch('/api/users')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

## Testing with cURL (Limited)

Clerk authentication cannot be fully tested with plain cURL because:
- It uses secure HTTP-only cookies
- It requires browser-based OAuth flows
- Session management is handled by Clerk's servers

However, you can test:

### Public Endpoints (Should Work)

```bash
# Test login page
curl -I http://localhost:3000/login

# Test signup page  
curl -I http://localhost:3000/signup
```

### Protected Endpoints (Should Return 401)

```bash
# Without authentication - should return 401
curl -I http://localhost:3000/api/users
# Expected: HTTP/1.1 401 Unauthorized

curl -I http://localhost:3000/api/sales
# Expected: HTTP/1.1 401 Unauthorized
```

## Verification Checklist

- [ ] `.env.local` has Clerk keys
- [ ] Dev server starts without errors
- [ ] `/login` page loads (shows Clerk SignIn component)
- [ ] `/signup` page loads (shows Clerk SignUp component)
- [ ] Can create new account through signup
- [ ] Can sign in with created account
- [ ] Protected routes redirect to login when not authenticated
- [ ] Protected routes work when authenticated
- [ ] Can access dashboard after login
- [ ] API routes return 401 when not authenticated
- [ ] API routes work when authenticated (check Network tab)

## Common Issues

### "Clerk publishable key not set"

**Solution:** Add to `.env.local`:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Get keys from: https://dashboard.clerk.com/last-active?path=api-keys

### "User not found in database"

**Solution:** After Clerk signup, you need to create a corresponding user in your PostgreSQL database. The system maps Clerk users to DB users by email.

### "401 Unauthorized on protected routes"

**Expected behavior** when not authenticated. To test authenticated routes:
1. Sign in through browser
2. Use browser's Network tab to see authenticated requests
3. Or copy session cookies to use in curl

### "Redirect loop"

**Solution:** Check your middleware configuration and Clerk route protection settings.

## Next Steps

1. ✅ Test signup flow
2. ✅ Test login flow  
3. ✅ Verify protected routes work
4. ⏳ Update remaining client components to use Clerk hooks
5. ⏳ Remove all localStorage token code
6. ⏳ Test end-to-end user flow


