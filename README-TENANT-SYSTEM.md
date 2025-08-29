# TrackX Tenant System

## Overview

TrackX implements a multi-tenant architecture where different organizations can access their own isolated workspace through subdomains.

## How It Works

### 1. Main Domain (e.g., wydex.co)
- **Purpose**: Marketing/landing page for TrackX
- **Content**: Features, pricing, testimonials, demo signup
- **File**: `src/app/page.tsx`
- **Logic**: Shows when `subdomain` is `null`

### 2. Tenant Subdomains (e.g., proskill.wydex.co)
- **Purpose**: Tenant-specific workspace homepage
- **Content**: Login, leaderboard, basic tenant features
- **File**: `src/app/tenant-homepage.tsx`
- **Logic**: Shows when `subdomain` has a value

## Routing Logic

The main `page.tsx` file includes conditional rendering:

```typescript
// If we have a subdomain, show tenant homepage instead
if (subdomain) {
  // Import and render tenant homepage dynamically
  const TenantHomepage = dynamic(() => import('./tenant-homepage'), {
    loading: () => <LoadingSpinner />,
    ssr: false
  });
  return <TenantHomepage />;
}

// Otherwise, show the main marketing page
return <MainMarketingPage />;
```

## Tenant Detection

The `useTenant()` hook detects subdomains:

- **localhost** → Main domain (development)
- **wydex.co** → Main domain (no subdomain)
- **proskill.wydex.co** → Tenant domain (subdomain: "proskill")
- **192.168.1.1** → Main domain (IP addresses)

## File Structure

```
src/app/
├── page.tsx              # Main marketing page (wydex.co)
├── tenant-homepage.tsx   # Tenant homepage (proskill.wydex.co)
├── leaderboard/          # Shared features
├── form/                 # Shared features
├── login/                # Shared features
└── ...
```

## Testing

### Test Main Domain
1. Visit `localhost:3000` (development)
2. Should see full marketing page with features, pricing, etc.

### Test Tenant Domain
1. Visit `proskill.localhost:3000` (development)
2. Should see simplified tenant homepage with login, leaderboard, etc.

## Benefits

1. **SEO**: Main domain can be optimized for search engines
2. **Branding**: Each tenant gets their own workspace
3. **Isolation**: Tenants are completely separated
4. **Flexibility**: Easy to customize per tenant if needed

## Future Enhancements

- Tenant-specific branding and colors
- Custom domains for enterprise clients
- Tenant-specific feature toggles
- Analytics per tenant workspace
