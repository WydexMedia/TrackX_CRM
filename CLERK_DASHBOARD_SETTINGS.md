# Quick Guide: Disable Phone Number in Clerk Dashboard

## Steps to Remove Phone Number from Signup

### 1. Login to Clerk Dashboard
- Go to: https://dashboard.clerk.com
- Select your application

### 2. Navigate to Authentication Settings
- Click **"User & Authentication"** in the left sidebar
- Click **"Email, Phone, Username"**

### 3. Configure Primary Identification
- Under **"Primary identification"** section:
  - Select **"Email address"** as the primary identifier
  - Make sure **"Phone number"** is NOT selected

### 4. Configure Sign-up Options
- Scroll down to **"Sign-up options"**
- Ensure:
  - ✅ **Email** is checked/enabled
  - ❌ **Phone number** is unchecked/disabled

### 5. Save Changes
- Click **"Save"** at the bottom of the page
- Wait 1-2 minutes for changes to propagate

### 6. Test
- Go to your signup page
- You should only see Email and Password fields
- No phone number field should appear

## Alternative: Set Phone to Optional

If you can't completely disable phone:

1. Under **"Email, Phone, Username"**
2. Set **"Phone number"** to **"Optional"**
3. This way it won't be required, but the field might still appear

## Visual Guide Locations

```
Clerk Dashboard
└── User & Authentication
    └── Email, Phone, Username
        ├── Primary identification
        │   └── Select: Email address only
        └── Sign-up options
            └── Enable: Email only
            └── Disable: Phone number
```

## Troubleshooting

**Phone field still shows?**
1. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Clear browser cache
3. Wait 2-3 minutes for Clerk to update
4. Check if you have multiple Clerk applications - make sure you're editing the right one

**Getting error about phone numbers?**
- The error should disappear once phone is disabled in Dashboard
- Make sure to save settings and wait for propagation


