# Quick Test Guide for Clerk Authentication

## 🚀 Fastest Way to Test

### 1. Make sure you have Clerk keys in `.env.local`

```bash
cd trackx
# Edit .env.local and add:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Get keys from: https://dashboard.clerk.com/last-active?path=api-keys

### 2. Start your dev server

```bash
npm run dev
```

### 3. Run automated tests

```bash
# Test Clerk setup and endpoints
npm run test:clerk

# Or use the shell script
npm run test:auth
```

### 4. Test in Browser (Required for Full Auth Flow)

Open your browser and go to:

```
http://localhost:3000/login
```

**Try these:**
- Click "Sign Up" and create a test account
- Sign out and sign back in
- Access protected pages like `/dashboard`
- Check that you can't access protected pages when logged out

## 📝 Quick cURL Commands

### Test Public Endpoints

```bash
# Login page (should return 200)
curl -I http://localhost:3000/login

# Signup page (should return 200)
curl -I http://localhost:3000/signup
```

### Test Protected Endpoints (Should Return 401)

```bash
# Without auth - should be 401
curl -I http://localhost:3000/api/users
curl -I http://localhost:3000/api/sales
```

### Run All Quick Tests

```bash
./test-curl-examples.sh
```

## 🔍 What to Look For

### ✅ Good Signs:
- Login page loads (shows Clerk sign-in form)
- Signup page loads (shows Clerk sign-up form)
- Protected API routes return `401 Unauthorized` without auth
- Can create account and sign in through browser
- Protected pages work after sign-in

### ❌ Problems:
- `500 Internal Server Error` → Check Clerk keys in `.env.local`
- `404 Not Found` → Check your routes are correct
- Can't sign up → Check Clerk dashboard settings
- Can't sign in → Check Clerk dashboard for user

## 🐛 Troubleshooting

### "Clerk publishable key not set"
- Make sure `.env.local` exists in `trackx/` directory
- Restart dev server after adding keys
- Keys should start with `pk_test_` (publishable) and `sk_test_` (secret)

### "Cannot access protected routes"
- Sign in through browser first
- Clerk uses cookies for authentication
- Check browser console for errors

### "User not found"
- After Clerk signup, user must exist in PostgreSQL database
- System maps Clerk users to DB users by email
- You may need to create DB user manually or set up sync

## 📚 Full Documentation

See `TEST_CLERK.md` for detailed testing instructions.

## ⚡ One-Liner Test

```bash
# Start server, test endpoints, open browser
npm run dev & sleep 3 && curl -I http://localhost:3000/login && open http://localhost:3000/login
```


