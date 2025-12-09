# Clerk Signup Redirect & User Sync Setup

## What Was Implemented

### 1. Redirect After Signup ✅
- Updated `signup/page.tsx` to redirect to `/team-leader/onboarding` after successful signup
- The onboarding page will sync the user to the database and redirect to the dashboard

### 2. User Sync API ✅
- Created `/api/users/sync-clerk` endpoint to sync Clerk users to database
- Automatically assigns `teamleader` role to new signups

### 3. Onboarding Page ✅
- Created `/team-leader/onboarding` page that:
  - Syncs Clerk user to database with teamleader role
  - Redirects to team leader dashboard

### 4. Webhook Handler ✅ (Optional - for automatic sync)
- Created `/api/webhooks/clerk` endpoint for automatic user creation
- Handles `user.created` events from Clerk

## Setup Instructions

### Step 1: Install svix Package (for webhook)

```bash
cd trackx
npm install svix
```

### Step 2: Configure Clerk Webhook (Optional but Recommended)

1. Go to Clerk Dashboard: https://dashboard.clerk.com
2. Navigate to **Webhooks**
3. Click **Add Endpoint**
4. Enter your webhook URL: `https://yourdomain.com/api/webhooks/clerk`
5. Select events to listen to:
   - ✅ `user.created`
6. Copy the **Signing Secret** (starts with `whsec_`)
7. Add to your `.env.local`:
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

### Step 3: Test the Flow

1. **Sign up a new user** via `/signup`
2. **Complete email verification**
3. **User should be redirected** to `/team-leader/onboarding`
4. **Onboarding page syncs** user to database with `teamleader` role
5. **Auto-redirects** to `/team-leader` dashboard

## How It Works

### Flow 1: With Webhook (Automatic)
1. User signs up via Clerk
2. Clerk sends `user.created` webhook
3. Webhook handler creates user in database with `teamleader` role
4. User is redirected to onboarding page
5. Onboarding page verifies sync and redirects to dashboard

### Flow 2: Without Webhook (Manual Sync)
1. User signs up via Clerk
2. User is redirected to `/team-leader/onboarding`
3. Onboarding page calls `/api/users/sync-clerk`
4. API creates user in database with `teamleader` role
5. User is redirected to `/team-leader` dashboard

## Database Schema

Users are created with:
- `email`: From Clerk email
- `code`: Same as email (used as employee code)
- `name`: From Clerk first name + last name
- `role`: `"teamleader"` (default for signups)
- `password`: Empty string (Clerk handles auth)
- `target`: 0
- `tenantId`: null (can be set later)

## Troubleshooting

### User not redirecting?
- Check browser console for errors
- Verify Clerk redirect settings in Dashboard
- Check if onboarding page is loading

### User not syncing to database?
- Check API endpoint `/api/users/sync-clerk` is working
- Verify user has email in Clerk
- Check database connection

### Webhook not working?
- Verify `CLERK_WEBHOOK_SECRET` is set in `.env.local`
- Check webhook URL is correct in Clerk Dashboard
- Verify `svix` package is installed

## Next Steps

1. **Install svix package**: `npm install svix`
2. **Set up Clerk webhook** (optional but recommended)
3. **Test signup flow** with a new user
4. **Verify user is created** in database with `teamleader` role
5. **Confirm redirect** to team leader dashboard


