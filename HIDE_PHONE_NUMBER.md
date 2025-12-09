# How to Remove Phone Number Field from Clerk Signup

## Problem
Clerk is showing a phone number field with "IN +91" (India country code), but India phone numbers are not supported.

## Solution - Multiple Approaches

### ✅ Approach 1: Dashboard Configuration (RECOMMENDED - Permanent Fix)

This is the **proper way** to disable phone numbers:

1. **Go to Clerk Dashboard**: https://dashboard.clerk.com
2. **Navigate to**: User & Authentication → Email, Phone, Username
3. **Primary identification**: Select **"Email address"** only
4. **Sign-up options**: 
   - ✅ Enable "Email"
   - ❌ Disable "Phone number"
5. **Save** and wait 1-2 minutes

**This will permanently remove the phone field from ALL signup forms.**

### ✅ Approach 2: Code-Based Hiding (Temporary Workaround)

I've added CSS and JavaScript to hide phone fields in the code:

1. **CSS hiding** in `globals.css` - Hides phone inputs via CSS
2. **JavaScript hiding** in `signup/page.tsx` - Aggressively hides phone fields after page load

The phone field should now be hidden visually.

### ⚠️ Why Both Approaches?

- **Dashboard settings** = Permanent, proper solution
- **Code hiding** = Temporary workaround until Dashboard is configured

## Testing

1. **Hard refresh** your browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. **Clear cache** if phone field still appears
3. **Check** the signup page - phone field should be gone

## If Phone Field Still Appears

1. **Wait 2-3 minutes** after changing Dashboard settings
2. **Hard refresh** browser (clears Clerk component cache)
3. **Check Dashboard** - make sure phone is completely disabled
4. **Check browser console** for any errors

## Current Implementation

The code now:
- ✅ Hides phone inputs via CSS (globals.css)
- ✅ Uses JavaScript to hide phone fields after DOM loads
- ✅ Targets multiple selector patterns to catch all variations
- ✅ Removes phone fields even if Clerk Dashboard hasn't been updated

## Next Steps

**IMMEDIATE**: The CSS/JavaScript hiding should work now - refresh your browser!

**PERMANENT**: Update Clerk Dashboard settings as described above for a proper fix.


