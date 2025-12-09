# Configure Clerk for Email-Only Authentication (No Phone)

## Issue
India phone numbers are not supported by Clerk, so we need to configure email-only authentication.

## Solution: Configure Clerk Dashboard

The phone number field is controlled by Clerk Dashboard settings, not code. Follow these steps:

### Step 1: Go to Clerk Dashboard

1. Visit: https://dashboard.clerk.com
2. Select your application

### Step 2: Configure Authentication Methods

1. Go to **User & Authentication** → **Email, Phone, Username**
2. Under **Primary identification**, select **Email address only**
3. **Disable** phone number authentication:
   - Uncheck "Phone number" as a primary identifier
   - Set phone to "Optional" or disable it completely

### Step 3: Configure Sign-Up Settings

1. Go to **User & Authentication** → **Email, Phone, Username**
2. Scroll to **Sign-up options**
3. Make sure:
   - ✅ Email is enabled
   - ❌ Phone number is disabled/optional
   - Only "Email" is selected as a sign-up option

### Step 4: Configure Verification

1. Go to **User & Authentication** → **Email, Phone, Username**
2. Under **Verification**
   - Enable "Email verification"
   - Disable "Phone verification" if it's enabled

### Step 5: Update Social Connections (Optional)

If you want to allow social logins without phone:
1. Go to **User & Authentication** → **Social Connections**
2. Configure OAuth providers (Google, GitHub, etc.)
3. Make sure phone is not required for these connections

## Alternative: Use Clerk Configuration File

You can also create a Clerk configuration in your codebase, but the Dashboard settings take precedence.

## Verification

After making these changes:

1. Go to your signup page: `http://localhost:3000/signup`
2. You should only see:
   - Email field
   - Password field
   - No phone number field

## If Phone Field Still Appears

1. **Clear browser cache** - Clerk caches component configurations
2. **Hard refresh** - Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. **Check Dashboard settings again** - Make sure phone is completely disabled
4. **Wait a few minutes** - Clerk settings can take a minute to propagate

## Current Code Configuration

The signup page is already configured for email-only in the code. The component will respect your Clerk Dashboard settings.

## Support

If you still see phone number fields after following these steps:
- Check Clerk Dashboard settings are saved
- Contact Clerk support: support@clerk.com
- Reference this issue: "India phone numbers not supported, need email-only"


