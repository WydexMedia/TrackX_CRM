# CEO Portal System Brief - Multi-Tenant CRM

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Schemas & Models](#2-schemas--models)
3. [Auth & Session](#3-auth--session)
4. [API Surface](#4-api-surface)
5. [UI Flows](#5-ui-flows)
6. [Gaps & Risks](#6-gaps--risks)
7. [CEO Portal Design](#7-ceo-portal-design)
8. [Security, Privacy, Compliance](#8-security-privacy-compliance)
9. [Phased Rollout Plan](#9-phased-rollout-plan)
10. [Exact Diffs & Snippets](#10-exact-diffs--snippets)
11. [Final Checklist](#11-final-checklist)

---

## 1. System Overview

### Stack Summary
- **Next.js**: 15.3.4 (App Router)
- **Node Runtime**: 20+
- **ORM**: Drizzle ORM 0.44.4
- **Database Clients**: 
  - MongoDB (identity, users, sales, calls)
  - Neon Postgres (leads, tasks, integrations, settings, lead events, call logs, tenants)

### Multi-Tenant Strategy
- **Subdomain-based routing**: `{subdomain}.wydex.co`
- **Middleware extraction**: `src/middleware.ts` extracts subdomain from hostname
- **Header injection**: `x-tenant-subdomain` header set for all requests
- **Tenant resolution**: `src/lib/tenant.ts` maps subdomain to tenant ID

### Current Roles & Permissions
- **Sales**: Basic dashboard, form submission
- **Junior Lead (jl)**: Enhanced dashboard access
- **Team Leader (teamleader)**: User management, analytics, team oversight
- **Admin**: Tenant management (separate admin panel)

### Data Stores

#### MongoDB (Identity)
- **Users**: Authentication, roles, targets, tenant association
- **Sales**: Revenue tracking, performance metrics
- **Calls**: Call logs, outcomes, performance
- **Daily Reports**: Team performance tracking

#### Neon Postgres (Leads)
- **Leads**: Core CRM entities with tenant_id
- **Tasks**: Lead-related activities with tenant_id
- **Lead Events**: Timeline/audit trail with tenant_id
- **Call Logs**: Call history with tenant_id
- **Integrations**: Third-party connections with tenant_id
- **Settings**: Tenant-specific configurations
- **Tenants**: Multi-tenant registry

### Lead Lifecycle Implementation
- **Stages**: NEW → various stages → PAYMENT_DONE
- **Events**: STAGE_CHANGE, CALL_LOGGED, OWNER_CHANGE tracked in `leadEvents`
- **Tasks**: Follow-ups, callbacks, other activities
- **Timeline**: Activity feed showing all lead changes

---

## 2. Schemas & Models

### MongoDB Collections (Identity)
```javascript
// Users Collection
{
  _id: ObjectId,
  name: String,
  code: String,           // Employee code
  email: String,
  password: String,
  role: String,           // 'sales' | 'jl' | 'teamleader'
  target: Number,         // Monthly target
  tenantSubdomain: String, // Multi-tenant isolation
  createdAt: Date
}

// Sales Collection
{
  _id: ObjectId,
  ogaName: String,        // Salesperson name
  customerName: String,
  amount: Number,
  newAdmission: String,   // 'Yes' | 'No'
  tenantSubdomain: String,
  createdAt: Date
}

// Calls Collection
{
  _id: ObjectId,
  ogaName: String,
  callCompleted: String,
  callType: String,
  callStatus: String,
  notes: String,
  leadPhone: String,
  phone: String,
  tenantSubdomain: String,
  createdAt: Date
}
```

### Postgres Schema (Leads)
```sql
-- Core tables with tenant_id
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(32) NOT NULL,
  name VARCHAR(160),
  email VARCHAR(256),
  source VARCHAR(64),
  utm JSONB,
  stage VARCHAR(48) NOT NULL DEFAULT 'NEW',
  owner_id VARCHAR(64),
  score INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  tenant_id INTEGER,                    -- ✅ Has tenant_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  consent BOOLEAN DEFAULT true
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  lead_phone VARCHAR(32) NOT NULL,
  title VARCHAR(160) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
  type VARCHAR(24) DEFAULT 'OTHER',
  owner_id VARCHAR(64),
  priority VARCHAR(16) DEFAULT 'MEDIUM',
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tenant_id INTEGER,                    -- ✅ Has tenant_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_events (
  id SERIAL PRIMARY KEY,
  lead_phone VARCHAR(32) NOT NULL,
  type VARCHAR(48) NOT NULL,
  data JSONB,
  at TIMESTAMPTZ DEFAULT NOW(),
  actor_id VARCHAR(64),
  tenant_id INTEGER                     -- ✅ Has tenant_id
);

CREATE TABLE call_logs (
  id SERIAL PRIMARY KEY,
  lead_phone VARCHAR(32) NOT NULL,
  salesperson_id VARCHAR(64),
  phone VARCHAR(32) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  completed BOOLEAN DEFAULT false,
  qualified BOOLEAN,
  status VARCHAR(32) DEFAULT 'NONE',
  notes TEXT,
  tenant_id INTEGER,                    -- ✅ Has tenant_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  subdomain VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Migrations Analysis
- **0000_curious_aaron_stack.sql**: Initial schema
- **0001_flashy_thanos.sql**: Schema updates
- **0002_deep_triton.sql**: ⚠️ **CRITICAL ISSUE** - Dropped `active` column from tenants table

---

## 3. Auth & Session

### Current Authentication Flow
- **No JWT**: Uses localStorage for session persistence
- **Login**: `/api/users/login` validates credentials against MongoDB
- **Session**: User object stored in localStorage with role-based redirects
- **Tenant Context**: Extracted from subdomain via middleware

### Session Claims (Current)
```javascript
// Stored in localStorage
{
  _id: "mongoObjectId",
  name: "User Name",
  code: "USER123",
  email: "user@company.com",
  role: "sales" | "jl" | "teamleader",
  target: 300000,
  tenantSubdomain: "company" // Implicit from subdomain
}
```

### Missing Security Elements
- ❌ No JWT tokens
- ❌ No session expiration
- ❌ No CSRF protection
- ❌ No rate limiting
- ❌ No audit logging

---

## 4. API Surface

| Path | Method | Purpose | Auth Required | Role Required | Tenant Isolation |
|------|--------|---------|---------------|---------------|------------------|
| `/api/users/login` | POST | User authentication | ❌ | ❌ | ✅ Subdomain-based |
| `/api/users` | GET | List users | ✅ | teamleader | ✅ tenantSubdomain filter |
| `/api/users` | POST | Create user | ✅ | teamleader | ✅ tenantSubdomain injection |
| `/api/users` | PUT | Update user | ✅ | teamleader | ✅ tenantSubdomain filter |
| `/api/users` | DELETE | Delete user | ✅ | teamleader | ✅ tenantSubdomain filter |
| `/api/analytics` | GET | Team performance | ✅ | teamleader | ✅ tenantSubdomain filter |
| `/api/sales` | GET | Sales data | ✅ | Any authenticated | ✅ tenantSubdomain filter |
| `/api/sales` | POST | Create sale | ✅ | Any authenticated | ✅ tenantSubdomain injection |
| `/api/calls` | GET | Call logs | ✅ | Any authenticated | ✅ tenantSubdomain filter |
| `/api/calls` | POST | Log call | ✅ | Any authenticated | ✅ tenantSubdomain injection |
| `/api/tl/leads/*` | * | Lead management | ✅ | teamleader | ✅ tenantSubdomain filter |
| `/api/admin/tenants` | * | Tenant management | ✅ | admin | ❌ Global access |

### Query Patterns
- **Filtering**: All queries include `tenantSubdomain` filter
- **Pagination**: Limited implementation (most use `.limit(100)`)
- **Search**: Basic text matching, no advanced search
- **Sorting**: Limited to creation date ordering

---

## 5. UI Flows

### Current Role-Based Flows

#### Sales Role
- **Dashboard**: `/dashboard` - Personal sales metrics, target tracking
- **Form**: `/form` - Sale submission form
- **Leaderboard**: `/leaderboard` - Sales performance ranking

#### Junior Lead Role
- **Dashboard**: `/junior-leader` - Enhanced sales dashboard
- **Same flows as Sales** with additional permissions

#### Team Leader Role
- **Analytics**: `/team-leader` - Team performance overview
- **User Management**: Create/edit/delete team members
- **Lead Management**: `/team-leader/lead-management/*` - Full lead oversight
- **Team Management**: Performance tracking, KPI monitoring

#### Admin Role
- **Tenant Management**: `/admin/tenants` - Global tenant oversight
- **Tenant Details**: `/admin/tenants/[id]` - Individual tenant management

### Data Aggregation Points
- **Team Leader Dashboard**: Aggregates sales, calls, user performance
- **Analytics API**: Combines multiple collections for performance metrics
- **Leaderboards**: Real-time sales and call performance ranking

---

## 6. Gaps & Risks

### Critical Security Gaps
- ❌ **No RLS**: Postgres tables lack Row Level Security
- ❌ **Client-Side Tenant ID**: Some APIs accept tenantId from client
- ❌ **No Session Validation**: localStorage can be tampered with
- ❌ **Missing Rate Limits**: No API throttling or abuse protection
- ❌ **No Audit Logs**: Role changes, data access not tracked

### Data Isolation Issues
- ❌ **Partial tenant_id**: Some tables may have NULL tenant_id values
- ❌ **No RLS Policies**: Database-level tenant isolation missing
- ❌ **Direct SQL Access**: Some queries bypass tenant filtering

### Authentication Weaknesses
- ❌ **No JWT**: Session management vulnerable to XSS
- ❌ **No CSRF Protection**: Form submissions vulnerable
- ❌ **No Session Expiry**: Sessions persist indefinitely
- ❌ **No Multi-Factor Auth**: Single password authentication

### Business Logic Gaps
- ❌ **No Role Promotion Flow**: Manual role changes only
- ❌ **No User Invitation System**: Manual user creation only
- ❌ **No Feature Flags**: All features enabled for all tenants
- ❌ **No SLA Rules**: No automated lead follow-up enforcement

---

## 7. CEO Portal Design

### New Role: CEO (Tenant-Scoped Superuser)

#### A. Identity (MongoDB)

**Role Enum Update**
```javascript
// File: MongoDB Users Collection Schema
// Add to role field: 'CEO' | 'teamleader' | 'jl' | 'sales' | 'admin'

// CEO User Structure
{
  _id: ObjectId,
  name: "CEO Name",
  code: "CEO001",
  email: "ceo@company.com",
  password: "hashedPassword",
  role: "CEO",                    // NEW ROLE
  target: 0,                      // CEOs don't have sales targets
  tenantSubdomain: "company",     // Scoped to specific tenant
  permissions: {                  // NEW FIELD
    canManageUsers: true,
    canViewAllData: true,
    canManageSettings: true,
    canImpersonate: true
  },
  createdAt: Date,
  lastLoginAt: Date
}
```

**Admin Invite Flow**
```javascript
// File: src/app/api/admin/invite-ceo/route.js
export async function POST(request) {
  const { email, tenantSubdomain, invitedBy } = await request.json();
  
  // Create CEO invitation
  const invitation = {
    email,
    tenantSubdomain,
    role: 'CEO',
    status: 'invited',
    invitedBy,
    invitedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    token: crypto.randomUUID()
  };
  
  await db.collection('ceo_invitations').insertOne(invitation);
  
  // Send invitation email
  await sendCEOInvitation(email, invitation);
  
  return NextResponse.json({ success: true });
}
```

#### B. Postgres (Neon) Hardening

**Ensure tenant_id NOT NULL**
```sql
-- File: migrations/0003_ceo_portal_hardening.sql

-- Fix any NULL tenant_id values
UPDATE leads SET tenant_id = (SELECT id FROM tenants WHERE subdomain = 'default') WHERE tenant_id IS NULL;
UPDATE tasks SET tenant_id = (SELECT id FROM tenants WHERE subdomain = 'default') WHERE tenant_id IS NULL;
UPDATE lead_events SET tenant_id = (SELECT id FROM tenants WHERE subdomain = 'default') WHERE tenant_id IS NULL;
UPDATE call_logs SET tenant_id = (SELECT id FROM tenants WHERE subdomain = 'default') WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL
ALTER TABLE leads ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE lead_events ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE call_logs ALTER COLUMN tenant_id SET NOT NULL;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_tenant_id ON lead_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_id ON call_logs(tenant_id);
```

**Enable RLS**
```sql
-- File: migrations/0004_enable_rls.sql

-- Enable RLS on all tenant tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY tenant_isolation_leads ON leads
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::integer);

CREATE POLICY tenant_isolation_tasks ON tasks
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::integer);

CREATE POLICY tenant_isolation_lead_events ON lead_events
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::integer);

CREATE POLICY tenant_isolation_call_logs ON call_logs
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::integer);

CREATE POLICY tenant_isolation_integrations ON integrations
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::integer);

CREATE POLICY tenant_isolation_settings ON settings
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::integer);

-- CEO-specific policies (full access within tenant)
CREATE POLICY ceo_full_access_leads ON leads
  FOR ALL USING (
    current_setting('app.role') = 'CEO' AND 
    tenant_id = current_setting('app.tenant_id')::integer
  );

CREATE POLICY ceo_full_access_tasks ON tasks
  FOR ALL USING (
    current_setting('app.role') = 'CEO' AND 
    tenant_id = current_setting('app.tenant_id')::integer
  );

-- Similar policies for other tables...
```

**Session GUCs (Connection Settings)**
```typescript
// File: src/lib/db/session.ts
import { db } from '@/db/client';

export async function setSessionContext(tenantId: number, role: string, userId: string) {
  await db.execute(sql`
    SELECT set_config('app.tenant_id', ${tenantId.toString()}, true);
    SELECT set_config('app.role', ${role}, true);
    SELECT set_config('app.user_id', ${userId}, true);
  `);
}

export async function clearSessionContext() {
  await db.execute(sql`
    SELECT set_config('app.tenant_id', '', true);
    SELECT set_config('app.role', '', true);
    SELECT set_config('app.user_id', '', true);
  `);
}
```

#### C. API Middleware Changes

**Exact File & Function to Inject GUCs**
```typescript
// File: src/middleware/tenantContext.ts
import { NextRequest, NextResponse } from 'next/server';
import { setSessionContext, clearSessionContext } from '@/lib/db/session';

export async function withTenantContext(
  request: NextRequest,
  handler: (req: NextRequest, tenantId: number, role: string, userId: string) => Promise<NextResponse>
) {
  const subdomain = request.headers.get('x-tenant-subdomain');
  const user = await getCurrentUser(request);
  
  if (!subdomain || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }
  
  try {
    // Set session context for this request
    await setSessionContext(tenant.id, user.role, user._id);
    
    // Execute handler with context
    const response = await handler(request, tenant.id, user.role, user._id);
    
    return response;
  } finally {
    // Clear context after request
    await clearSessionContext();
  }
}

// Usage in API routes
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (req, tenantId, role, userId) => {
    // Your API logic here - tenant context is automatically set
    const leads = await db.select().from(leads).where(eq(leads.tenantId, tenantId));
    return NextResponse.json(leads);
  });
}
```

**Reject Client-Side tenantId**
```typescript
// File: src/lib/validation/tenantValidation.ts
export function validateNoClientTenantId(data: any) {
  if (data.tenantId || data.tenant_id) {
    throw new Error('tenantId cannot be set by client - use session context');
  }
  return data;
}

// Usage in API routes
export async function POST(request: NextRequest) {
  const body = await request.json();
  const cleanBody = validateNoClientTenantId(body);
  
  // Now safe to use cleanBody
  const result = await db.insert(leads).values({
    ...cleanBody,
    tenantId: tenantId // From session context
  });
}
```

#### D. Routes & Guards

**New Route Group: `/ceo/*`**
```typescript
// File: src/app/ceo/layout.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function CEOLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'CEO') {
    redirect('/unauthorized');
  }
  
  return (
    <div className="ceo-layout">
      <CEOSidebar />
      <main>{children}</main>
    </div>
  );
}
```

**Update Existing Dashboards for CEO Scope**
```typescript
// File: src/app/api/leads/route.ts
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (req, tenantId, role, userId) => {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'owner'; // tenant | team | owner
    
    let query = db.select().from(leads).where(eq(leads.tenantId, tenantId));
    
    if (scope === 'owner' && role !== 'CEO') {
      // Sales/JL/TeamLead see only their leads
      query = query.where(eq(leads.ownerId, userId));
    } else if (scope === 'team' && role === 'teamleader') {
      // TeamLead sees team leads
      const teamMembers = await getTeamMembers(tenantId, userId);
      query = query.where(inArray(leads.ownerId, teamMembers.map(u => u._id)));
    }
    // CEO sees all leads (scope ignored)
    
    const results = await query;
    return NextResponse.json(results);
  });
}
```

#### E. CEO Screens (Component/File List)

**File Structure**
```
src/app/ceo/
├── layout.tsx                    # CEO layout with sidebar
├── page.tsx                      # CEO overview dashboard
├── leads/
│   ├── page.tsx                 # Full-tenant leads grid
│   └── [id]/
│       └── page.tsx             # Lead detail view
├── teams/
│   ├── page.tsx                 # Team performance overview
│   └── [teamId]/
│       └── page.tsx             # Individual team details
├── users/
│   ├── page.tsx                 # User management
│   ├── invite/
│   │   └── page.tsx             # Invite new users
│   └── [userId]/
│       └── page.tsx             # User detail/edit
├── settings/
│   ├── page.tsx                 # Feature flags, SLA rules
│   ├── integrations/
│   │   └── page.tsx             # Third-party integrations
│   └── automations/
│       └── page.tsx             # Workflow automation rules
└── impersonate/
    └── [userId]/
        └── page.tsx             # User impersonation (view-only)
```

**Component Stubs**
```typescript
// File: src/app/ceo/page.tsx
export default function CEOOverviewPage() {
  return (
    <div className="ceo-overview">
      <KPISummary />
      <LeadFunnelChart />
      <TeamPerformanceGrid />
      <RecentActivityFeed />
    </div>
  );
}

// File: src/app/ceo/leads/page.tsx
export default function CEOLeadsPage() {
  return (
    <div className="ceo-leads">
      <LeadsFilterBar />
      <LeadsDataGrid />
      <ExportOptions />
    </div>
  );
}

// File: src/app/ceo/users/page.tsx
export default function CEOUsersPage() {
  return (
    <div className="ceo-users">
      <UsersTable />
      <InviteUserModal />
      <RoleManagementPanel />
    </div>
  );
}
```

#### F. Analytics Performance

**Materialized Views per Tenant**
```sql
-- File: migrations/0005_ceo_analytics_mvs.sql

-- Lead funnel conversion MV
CREATE MATERIALIZED VIEW mv_lead_funnel_daily AS
SELECT 
  tenant_id,
  DATE(at) as date,
  stage,
  COUNT(*) as lead_count,
  COUNT(DISTINCT lead_phone) as unique_leads
FROM lead_events 
WHERE type = 'STAGE_CHANGE'
GROUP BY tenant_id, DATE(at), stage;

-- Team performance MV
CREATE MATERIALIZED VIEW mv_team_performance_daily AS
SELECT 
  t.tenant_id,
  DATE(t.created_at) as date,
  t.owner_id,
  COUNT(t.id) as tasks_created,
  COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) as tasks_completed,
  AVG(CASE WHEN t.completed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/3600 
    END) as avg_completion_hours
FROM tasks t
GROUP BY t.tenant_id, DATE(t.created_at), t.owner_id;

-- Sales performance MV
CREATE MATERIALIZED VIEW mv_sales_performance_daily AS
SELECT 
  s.tenantSubdomain as tenant_subdomain,
  DATE(s.createdAt) as date,
  s.ogaName as salesperson,
  COUNT(*) as sales_count,
  SUM(s.amount) as total_amount
FROM sales s
GROUP BY s.tenantSubdomain, DATE(s.createdAt), s.ogaName;

-- Indexes for fast refresh
CREATE INDEX idx_mv_lead_funnel_tenant_date ON mv_lead_funnel_daily(tenant_id, date);
CREATE INDEX idx_mv_team_performance_tenant_date ON mv_team_performance_daily(tenant_id, date);
CREATE INDEX idx_mv_sales_performance_tenant_date ON mv_sales_performance_daily(tenant_subdomain, date);

-- Refresh strategy (run via cron)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lead_funnel_daily;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_team_performance_daily;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_performance_daily;
```

**Caching Layer**
```typescript
// File: src/lib/cache/analytics.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class AnalyticsCache {
  static async getKPIs(tenantId: number, date: string): Promise<any> {
    const key = `kpis:${tenantId}:${date}`;
    const cached = await redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Calculate from MVs
    const kpis = await calculateKPIs(tenantId, date);
    
    // Cache for 1 hour
    await redis.setex(key, 3600, JSON.stringify(kpis));
    
    return kpis;
  }
}
```

---

## 8. Security, Privacy, Compliance

### Current Protections
- ✅ **CORS**: Basic CORS handling
- ❌ **Rate Limits**: No API throttling
- ❌ **CSRF**: No CSRF protection
- ❌ **Audit Logs**: No sensitive action tracking

### CEO Portal Additions
```typescript
// File: src/lib/audit/auditLogger.ts
export class AuditLogger {
  static async logAction(action: string, userId: string, tenantId: number, details: any) {
    await db.insert(auditLogs).values({
      action,
      userId,
      tenantId,
      details: JSON.stringify(details),
      ipAddress: getClientIP(),
      userAgent: getUserAgent(),
      timestamp: new Date()
    });
  }
  
  static async logRoleChange(adminId: string, targetUserId: string, oldRole: string, newRole: string) {
    await this.logAction('ROLE_CHANGE', adminId, tenantId, {
      targetUserId,
      oldRole,
      newRole,
      reason: 'Admin role update'
    });
  }
  
  static async logImpersonation(ceoId: string, targetUserId: string, duration: number) {
    await this.logAction('IMPERSONATION_START', ceoId, tenantId, {
      targetUserId,
      duration,
      reason: 'CEO oversight'
    });
  }
}
```

### Secret Management
```bash
# File: .env.example
# Database
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb://...

# Redis (for caching)
REDIS_URL=redis://...

# JWT (new)
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Email (for CEO invitations)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Rate limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
```

### Backup/DR Notes
- **MongoDB**: Use MongoDB Atlas backup service
- **Neon Postgres**: Automated daily backups with 7-day retention
- **File Storage**: Logo uploads backed up to S3/CloudFront
- **Recovery**: Point-in-time recovery available for both databases

---

## 9. Phased Rollout Plan

### Phase 1: Foundation (1-2 days)
- [ ] Add CEO role to MongoDB users collection
- [ ] Update role enum in all TypeScript interfaces
- [ ] Create `/ceo` route group with basic guards
- [ ] Implement basic tenant-wide read access for CEO role

### Phase 2: Security Hardening (2-4 days)
- [ ] Enable RLS on all tenant tables
- [ ] Create tenant isolation policies
- [ ] Implement session GUC injection middleware
- [ ] Fix all queries that accept client-side tenantId
- [ ] Add tenant_id NOT NULL constraints

### Phase 3: Core Features (3-5 days)
- [ ] Build CEO dashboard with KPIs
- [ ] Implement full-tenant leads grid
- [ ] Create user management interface
- [ ] Build team performance views
- [ ] Add CEO invitation flow

### Phase 4: Advanced Features (ongoing)
- [ ] Implement audit logging system
- [ ] Add user impersonation feature
- [ ] Create materialized views for analytics
- [ ] Implement caching layer
- [ ] Add feature flags per tenant

---

## 10. Exact Diffs & Snippets

### MongoDB Models (Role Enum, CEO Invite Flow)

```javascript
// File: src/lib/mongo/schemas/userSchema.js
export const UserSchema = {
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['CEO', 'teamleader', 'jl', 'sales', 'admin'] // ADDED CEO
  },
  target: { type: Number, default: 0 },
  tenantSubdomain: { type: String, required: true },
  permissions: { // NEW FIELD
    canManageUsers: { type: Boolean, default: false },
    canViewAllData: { type: Boolean, default: false },
    canManageSettings: { type: Boolean, default: false },
    canImpersonate: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date }
};

// CEO permissions
export const CEOPermissions = {
  canManageUsers: true,
  canViewAllData: true,
  canManageSettings: true,
  canImpersonate: true
};
```

### Next.js Middleware/Route Guards

```typescript
// File: src/middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function authMiddleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    const payload = await verifyJWT(token);
    const response = NextResponse.next();
    
    // Add user info to headers for API routes
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-user-role', payload.role);
    response.headers.set('x-tenant-id', payload.tenantId);
    
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// File: src/middleware/roleGuard.ts
export function requireRole(requiredRole: string) {
  return function(Component: React.ComponentType) {
    return function RoleGuardedComponent(props: any) {
      const { user } = useAuth();
      
      if (!user || user.role !== requiredRole) {
        return <UnauthorizedPage />;
      }
      
      return <Component {...props} />;
    };
  };
}
```

### DB Client "set_config" Helper

```typescript
// File: src/lib/db/context.ts
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

export class TenantContext {
  static async set(tenantId: number, role: string, userId: string) {
    await db.execute(sql`
      SELECT set_config('app.tenant_id', ${tenantId.toString()}, true);
      SELECT set_config('app.role', ${role}, true);
      SELECT set_config('app.user_id', ${userId}, true);
    `);
  }
  
  static async clear() {
    await db.execute(sql`
      SELECT set_config('app.tenant_id', '', true);
      SELECT set_config('app.role', '', true);
      SELECT set_config('app.user_id', '', true);
    `);
  }
  
  static async withContext<T>(
    tenantId: number, 
    role: string, 
    userId: string, 
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      await this.set(tenantId, role, userId);
      return await operation();
    } finally {
      await this.clear();
    }
  }
}

// Usage in API routes
export async function GET(request: NextRequest) {
  const { tenantId, role, userId } = await getRequestContext(request);
  
  return await TenantContext.withContext(tenantId, role, userId, async () => {
    // All queries now automatically use session context
    const leads = await db.select().from(leads);
    return NextResponse.json(leads);
  });
}
```

### Postgres Migrations (tenant_id, RLS policies, MVs)

```sql
-- File: migrations/0003_ceo_portal_foundation.sql

-- Fix tenant_id constraints
ALTER TABLE leads ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE lead_events ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE call_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE integrations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE settings ALTER COLUMN tenant_id SET NOT NULL;

-- Add missing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_events_tenant_id ON lead_events(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_tenant_id ON call_logs(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integrations_tenant_id ON integrations(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_settings_tenant_id ON settings(tenant_id);

-- File: migrations/0004_enable_rls.sql

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY tenant_isolation_leads ON leads
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::integer);

CREATE POLICY ceo_full_access_leads ON leads
  FOR ALL USING (
    current_setting('app.role') = 'CEO' AND 
    tenant_id = current_setting('app.tenant_id')::integer
  );

-- Repeat for other tables...
```

### API Handlers: Sample Secured Query Using GUCs

```typescript
// File: src/app/api/ceo/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/middleware/tenantContext';
import { db } from '@/db/client';
import { leads, leadEvents } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (req, tenantId, role, userId) => {
    if (role !== 'CEO') {
      return NextResponse.json({ error: 'CEO access required' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const ownerId = searchParams.get('ownerId');
    
    // Build query - RLS automatically filters by tenant_id
    let query = db.select().from(leads);
    
    if (stage) {
      query = query.where(eq(leads.stage, stage));
    }
    
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(leads.createdAt, new Date(startDate)),
          lte(leads.createdAt, new Date(endDate))
        )
      );
    }
    
    if (ownerId) {
      query = query.where(eq(leads.ownerId, ownerId));
    }
    
    // CEO sees all leads for tenant (RLS handles tenant isolation)
    const results = await query.orderBy(desc(leads.createdAt)).limit(1000);
    
    return NextResponse.json({
      leads: results,
      total: results.length,
      filters: { stage, startDate, endDate, ownerId }
    });
  });
}
```

### UI: Minimal CEO Layout + Page Stubs

```typescript
// File: src/app/ceo/layout.tsx
import { CEOSidebar } from '@/components/ceo/CEOSidebar';
import { CEOHeader } from '@/components/ceo/CEOHeader';

export default function CEOLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CEOHeader />
      <div className="flex">
        <CEOSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// File: src/components/ceo/CEOSidebar.tsx
export function CEOSidebar() {
  return (
    <aside className="w-64 bg-white shadow-lg min-h-screen">
      <nav className="p-4">
        <ul className="space-y-2">
          <li>
            <Link href="/ceo" className="flex items-center p-3 rounded-lg hover:bg-gray-100">
              <DashboardIcon className="w-5 h-5 mr-3" />
              Overview
            </Link>
          </li>
          <li>
            <Link href="/ceo/leads" className="flex items-center p-3 rounded-lg hover:bg-gray-100">
              <UsersIcon className="w-5 h-5 mr-3" />
              All Leads
            </Link>
          </li>
          <li>
            <Link href="/ceo/teams" className="flex items-center p-3 rounded-lg hover:bg-gray-100">
              <TeamIcon className="w-5 h-5 mr-3" />
              Team Performance
            </Link>
          </li>
          <li>
            <Link href="/ceo/users" className="flex items-center p-3 rounded-lg hover:bg-gray-100">
              <UserManagementIcon className="w-5 h-5 mr-3" />
              User Management
            </Link>
          </li>
          <li>
            <Link href="/ceo/settings" className="flex items-center p-3 rounded-lg hover:bg-gray-100">
              <SettingsIcon className="w-5 h-5 mr-3" />
              Settings
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
```

---

## 11. Final Checklist

### Security & Data Isolation
- [ ] All Postgres tables have tenant_id & indexes
- [ ] RLS enabled + tenant_isolation + ceo_full policies
- [ ] API always sets app.tenant_id/app.role/app.user_id
- [ ] Client cannot override tenantId
- [ ] CEO routes guarded

### Performance & Analytics
- [ ] Analytics fast (MVs/caching)
- [ ] Materialized views created and indexed
- [ ] Cache layer implemented for KPIs
- [ ] Database queries optimized with proper indexes

### User Management & Security
- [ ] Audit logs for role changes & impersonation
- [ ] Invite emails for CEO + team members
- [ ] Role promotion/demotion flows implemented
- [ ] User impersonation feature (time-boxed, audit logged)

### Feature Management
- [ ] Feature flags per tenant (if applicable)
- [ ] Gallabox integration behind a feature flag per tenant
- [ ] SLA rules configurable per tenant
- [ ] Custom lead sources per tenant

### What I Couldn't Find
- **JWT Implementation**: No existing JWT system - needs to be built from scratch
- **Rate Limiting**: No rate limiting middleware - needs implementation
- **CSRF Protection**: No CSRF tokens - needs to be added
- **Session Management**: Current localStorage approach needs replacement
- **Audit Logging**: No existing audit system - needs complete implementation
- **Feature Flags**: No feature flag system - needs to be built
- **Email Service**: No email service integration - needs to be added for CEO invitations

### Assumptions Made
- **MongoDB Schema**: Assumed users collection structure based on API usage
- **Postgres RLS**: Assumed RLS can be enabled without breaking existing queries
- **CEO Permissions**: Assumed CEO should have full tenant access but not cross-tenant
- **Performance**: Assumed materialized views will significantly improve analytics performance
- **Security Model**: Assumed JWT-based authentication is preferred over current localStorage approach

---

## Summary

This system brief provides a comprehensive roadmap for implementing a secure, scalable CEO Portal that maintains proper tenant isolation while providing the necessary oversight capabilities for executive users. The implementation follows a phased approach that prioritizes security hardening before adding new features, ensuring that the multi-tenant architecture remains robust and secure throughout the development process.

The CEO Portal will enable:
- **Full tenant visibility** for executive oversight
- **Secure data access** through Row Level Security
- **Performance optimization** via materialized views and caching
- **Audit compliance** through comprehensive logging
- **User management** capabilities for organizational control

All changes maintain backward compatibility while significantly improving the security posture and scalability of the existing multi-tenant CRM system. 