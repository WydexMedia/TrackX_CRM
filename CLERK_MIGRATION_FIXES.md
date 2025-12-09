# Clerk Migration - Remaining Issues & Fixes

## Summary
After migrating to Clerk authentication, several pages are still using old localStorage-based authentication, causing features to break.

## Issues Found

### 1. Pages Still Using localStorage (15 files)
- `team-leader/page.tsx` ✅ FIXED
- `team-leader/sales/page.tsx` - Needs fix
- `team-leader/profile/page.tsx` - Needs fix
- `team-leader/kpis/page.tsx` - Needs fix
- `team-leader/leads/page.tsx` - Needs check (may be OK if just fetching)
- `team-leader/team-management/page.tsx` - Needs check
- `team-leader/reports/page.tsx` - Needs check
- `team-leader/automations/page.tsx` - Needs check
- `dashboard/page.tsx` - Needs fix
- `form/page.tsx` - Needs fix
- Others...

### 2. Common Patterns That Need Fixing

#### Pattern 1: Reading user from localStorage
```typescript
// ❌ OLD - Don't use
const user = localStorage.getItem("user");
if (user) {
  setTeamLeader(JSON.parse(user));
}

// ✅ NEW - Use Clerk
import { useUser } from "@clerk/nextjs";
const { user, isLoaded } = useUser();
const userName = user?.fullName || user?.firstName || "User";
```

#### Pattern 2: Using token in API calls
```typescript
// ❌ OLD - Don't use
const token = localStorage.getItem('token');
fetch('/api/something', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// ✅ NEW - Clerk handles via cookies automatically
fetch('/api/something'); // Cookies are sent automatically
```

#### Pattern 3: Checking role from localStorage
```typescript
// ❌ OLD - Don't use
const user = JSON.parse(localStorage.getItem("user"));
if (user.role !== "teamleader") {
  router.push("/login");
}

// ✅ NEW - Use Clerk hooks (layout already handles this)
import { useClerkRole } from "@/lib/clerkRoles";
const { isAdmin, appRole } = useClerkRole();
// Layout already redirects unauthorized users
```

## Fix Priority

### High Priority (User-facing features)
1. ✅ `team-leader/page.tsx` - Main dashboard
2. `team-leader/profile/page.tsx` - Profile editing
3. `team-leader/sales/page.tsx` - Sales management
4. `form/page.tsx` - Sales form submission

### Medium Priority
5. `team-leader/kpis/page.tsx` - KPIs dashboard
6. `team-leader/leads/page.tsx` - Leads management
7. `team-leader/team-management/page.tsx` - Team management

### Low Priority (May work, just need verification)
8. Other pages in team-leader directory

## Status
- ✅ Created Clerk role helpers (`clerkRoles.ts`, `clerkRolesServer.ts`)
- ✅ Updated login redirect to use Clerk org roles
- ✅ Updated team-leader layout to use Clerk
- ✅ Updated junior-leader page to use Clerk
- ✅ Updated Sidebar to use Clerk logout
- ✅ Fixed API routes to use Clerk authentication
- ✅ Fixed team-leader/page.tsx (overview dashboard)
- ⏳ Remaining: 14+ pages need localStorage removal

## Next Steps
1. Fix high-priority pages first
2. Test each page after fixing
3. Remove all localStorage references
4. Ensure API calls work (they should - Clerk handles cookies)

