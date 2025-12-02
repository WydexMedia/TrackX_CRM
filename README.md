# TrackX CRM - Enterprise Multi-Tenant CRM System

A comprehensive, enterprise-grade Customer Relationship Management (CRM) system built with Next.js, featuring multi-tenant architecture, dual database support, and advanced lead management capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Database Architecture](#database-architecture)
- [Multi-Tenant System](#multi-tenant-system)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Authentication & Security](#authentication--security)
- [Deployment](#deployment)
- [Infrastructure](#infrastructure)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)

---

## 🎯 Overview

TrackX CRM is a full-stack CRM solution designed for sales teams and organizations managing leads, tasks, and customer relationships. The system supports multiple tenants (organizations) through a sophisticated subdomain-based routing system, enabling complete data isolation while sharing the same infrastructure.

### Key Features

- **Multi-Tenant Architecture**: Subdomain-based tenant isolation
- **Dual Database System**: MongoDB for sales/analytics data, PostgreSQL for structured lead management
- **Advanced Lead Management**: Stage-based workflows, follow-ups, scoring, and filtering
- **Task Management**: Priority-based task tracking with due dates
- **Analytics & Reporting**: Real-time dashboards, leaderboards, and KPI tracking
- **Team Management**: Role-based access control (Sales, Team Leader, Admin)
- **Call Tracking**: Integration with call management systems
- **Real-time Updates**: Live leaderboards and activity feeds

---

## 🏗️ Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │  Mobile Web  │  │  Public API  │          │
│  │ (Next.js FE) │  │   (PWA)      │  │   (Leader)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network (Mumbai)                  │
│                    ┌──────────────────────┐                     │
│                    │   Next.js App Router │                     │
│                    │   (API Routes + SSR) │                     │
│                    └──────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│   MongoDB Atlas          │    │   AWS RDS PostgreSQL      │
│   (Mumbai Region)        │    │   (Mumbai Region)         │
│                          │    │                          │
│  • Sales Data            │    │  • Leads                 │
│  • User Sessions         │    │  • Tasks                 │
│  • Analytics             │    │  • Tenant Config         │
│  • JWT Blacklist         │    │  • Integrations          │
│  • Call Records          │    │  • Settings               │
└──────────────────────────┘    └──────────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                    ┌──────────────────┐
                    │   AWS S3 Bucket   │
                    │   (Static Files)  │
                    │   • Logos         │
                    │   • Uploads       │
                    └──────────────────┘
```

### Architecture Principles

1. **Separation of Concerns**: Clear separation between frontend (Next.js), backend (API Routes), and data layers
2. **Database Specialization**: 
   - MongoDB for flexible, document-based sales and analytics data
   - PostgreSQL for structured relational data requiring complex queries, joins, and filtering
3. **Multi-Tenancy**: Subdomain-based routing ensures complete tenant isolation
4. **Serverless-First**: Leverages Vercel's serverless functions for scalability
5. **Regional Optimization**: All services deployed in Mumbai region for low latency

---

## 🛠️ Technology Stack

### Frontend

- **Framework**: Next.js 15.3.4 (App Router)
- **Language**: TypeScript 5.x
- **UI Library**: React 19.0.0
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Radix UI (Dialog, Dropdown, Tooltip, Accordion)
- **Forms**: React Hook Form + Yup validation
- **State Management**: React Hooks (useState, useEffect, useContext)
- **Animations**: Framer Motion
- **Icons**: Lucide React, Radix UI Icons
- **Notifications**: React Hot Toast
- **Data Fetching**: Native Fetch API with authentication middleware

### Backend

- **Runtime**: Node.js (via Next.js API Routes)
- **API Framework**: Next.js App Router API Routes
- **Authentication**: JWT (JSON Web Tokens)
- **Session Management**: MongoDB-based token blacklist
- **File Processing**: Native File API, XLSX for Excel imports

### Databases

#### MongoDB Atlas
- **Purpose**: Sales data, user sessions, analytics, call records
- **Driver**: MongoDB Node.js Driver 6.17.0
- **Region**: Mumbai (ap-south-1)
- **Collections**:
  - `users`: User accounts and authentication
  - `sales`: Sales transactions and records
  - `calls`: Call tracking and outcomes
  - `jwt_blacklist`: Revoked JWT tokens
  - `analytics`: Aggregated analytics data

#### PostgreSQL (AWS RDS)
- **Purpose**: Lead management, tasks, tenant configuration
- **ORM**: Drizzle ORM 0.44.4
- **Region**: Mumbai (ap-south-1)
- **Connection**: AWS RDS with SSL/TLS
- **Tables**:
  - `leads`: Lead information and tracking
  - `tasks`: Task management
  - `tenants`: Tenant configuration
  - `lead_events`: Lead activity history
  - `integrations`: Third-party integrations
  - `settings`: Tenant-specific settings
  - `stages`: Lead pipeline stages
  - `courses`: Course/product catalog

### Development Tools

- **Package Manager**: npm
- **Database Migrations**: Drizzle Kit
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint (Next.js default)
- **Type Checking**: TypeScript
- **Build Tool**: Next.js Turbopack (dev mode)

---

## 💾 Database Architecture

### Why Dual Database?

The system uses both MongoDB and PostgreSQL to leverage the strengths of each:

#### MongoDB Atlas - Document Store
**Use Cases:**
- Sales transactions (flexible schema, frequent writes)
- User sessions and authentication tokens
- Analytics aggregations (time-series data)
- Call records (semi-structured data)
- Real-time leaderboard data

**Advantages:**
- Flexible schema for evolving data structures
- High write throughput for sales data
- Native support for nested documents
- Efficient for time-series analytics

#### PostgreSQL (AWS RDS) - Relational Database
**Use Cases:**
- Lead management (complex filtering, joins)
- Task management (relational queries)
- Tenant configuration (ACID compliance)
- Lead pipeline stages (referential integrity)
- Multi-table joins for reporting

**Advantages:**
- Complex SQL queries with JOINs
- Advanced filtering and aggregation
- ACID transactions for data consistency
- Foreign key constraints
- Optimized indexes for query performance
- Perfect for relational data requiring integrity

### Database Schema Overview

#### PostgreSQL Schema (Drizzle ORM)

```typescript
// Core Tables
leads {
  id, phone, name, email, address, alternateNumber,
  source, utm, stage, ownerId, score,
  lastActivityAt, needFollowup, followupDate,
  followupNotes, courseId, paidAmount, tenantId,
  createdAt, updatedAt, consent
}

tasks {
  id, leadPhone, title, status, type, ownerId,
  priority, dueAt, completedAt, tenantId,
  createdAt, updatedAt
}

tenants {
  id, subdomain, name, metadata, createdAt, updatedAt
}

lead_events {
  id, leadPhone, type, description, ownerId,
  tenantId, createdAt
}

integrations {
  id, provider, name, status, lastSyncAt,
  metrics24h, tenantId, createdAt
}

settings {
  key, value, tenantId, updatedAt
}
```

#### MongoDB Collections

```javascript
// Users Collection
users {
  _id, email, password, role, tenantSubdomain,
  name, phone, lastLogin, lastLogout, createdAt
}

// Sales Collection
sales {
  _id, userId, amount, product, tenantSubdomain,
  leadPhone, status, createdAt
}

// Calls Collection
calls {
  _id, userId, leadPhone, duration, outcome,
  tenantSubdomain, startedAt, endedAt
}

// JWT Blacklist
jwt_blacklist {
  token, userId, revokedAt, reason
}
```

### Indexing Strategy

#### PostgreSQL Indexes
- Composite indexes on `(tenantId, phone)` for lead lookups
- Indexes on `ownerId`, `stage`, `createdAt` for filtering
- Indexes on `followupDate`, `needFollowup` for task queries
- Full-text search indexes on lead names/emails

#### MongoDB Indexes
- Compound indexes on `(email, tenantSubdomain)` for user lookups
- Indexes on `userId`, `tenantSubdomain` for sales queries
- TTL indexes on `jwt_blacklist` for automatic cleanup
- Indexes on `createdAt` for time-based queries

---

## 🏢 Multi-Tenant System

### Subdomain-Based Routing

The system implements a sophisticated multi-tenant architecture using subdomain routing:

#### How It Works

1. **Subdomain Extraction**: Middleware extracts subdomain from the request host
   - `proskill.wydex.co` → subdomain: `proskill`
   - `wydex.co` → subdomain: `null` (main domain)
   - `localhost` → subdomain: `null` (development)

2. **Tenant Resolution**: Each subdomain maps to a tenant ID in PostgreSQL
   - Tenant lookup via `tenants` table using subdomain
   - Tenant ID injected into all database queries
   - Complete data isolation per tenant

3. **Route Handling**:
   - Main domain (`wydex.co`): Marketing/landing page
   - Tenant subdomain (`proskill.wydex.co`): Tenant-specific workspace

#### Middleware Flow

```typescript
Request → Middleware → Extract Subdomain → 
Set x-tenant-subdomain Header → API Route → 
Tenant Context → Database Query (with tenantId filter)
```

#### Tenant Isolation

- **Data Isolation**: All queries automatically filtered by `tenantId`
- **User Isolation**: Users belong to specific tenants
- **Configuration Isolation**: Each tenant has separate settings
- **Logo/Branding**: Tenant-specific logos and branding

### Tenant Configuration

Each tenant has:
- Unique subdomain
- Custom branding (logo, colors)
- Tenant-specific settings
- Isolated user base
- Separate lead pipeline
- Independent analytics

---

## 🎨 Frontend Architecture

### Next.js App Router Structure

```
src/app/
├── page.tsx                 # Main landing page (no subdomain)
├── tenant-homepage.tsx      # Tenant workspace (with subdomain)
├── layout.tsx               # Root layout with providers
├── login/                   # Authentication pages
├── signup/                  # User registration
├── dashboard/               # Sales agent dashboard
├── team-leader/             # Team leader interface
│   ├── leads/               # Lead management
│   ├── tasks/               # Task management
│   ├── analytics/           # Analytics dashboard
│   ├── reports/             # Reporting
│   ├── settings/            # Tenant settings
│   └── ...
├── leaderboard/             # Public leaderboard
└── api/                     # API routes (backend)
```

### Component Architecture

- **Server Components**: Default for data fetching and SEO
- **Client Components**: Interactive UI with `'use client'` directive
- **Shared Components**: Reusable UI components in `src/components/`
- **Layout Components**: Nested layouts for role-based UI

### State Management

- **Server State**: Fetched in Server Components or API routes
- **Client State**: React hooks (useState, useReducer)
- **Form State**: React Hook Form
- **Global State**: Context API for tenant and auth state

### Performance Optimizations

- **Code Splitting**: Automatic via Next.js App Router
- **Image Optimization**: Next.js Image component with WebP/AVIF
- **Font Optimization**: Next.js font optimization
- **Bundle Optimization**: Tree-shaking and dynamic imports
- **Caching**: Static generation and ISR where applicable

---

## ⚙️ Backend Architecture

### API Routes Structure

All backend logic is implemented as Next.js API Routes:

```
src/app/api/
├── users/                    # User management
│   ├── login/               # Authentication
│   ├── logout/              # Session termination
│   ├── current/             # Current user info
│   └── ...
├── tl/                      # Team Leader APIs
│   ├── leads/               # Lead CRUD operations
│   ├── tasks/               # Task management
│   ├── analytics/           # Analytics endpoints
│   ├── reports/             # Report generation
│   └── ...
├── sales/                   # Sales tracking
├── calls/                   # Call management
├── analytics/               # Analytics aggregation
└── tenants/                 # Tenant management
```

### Request Flow

```
Client Request → Middleware (Subdomain Extraction) → 
API Route → Authentication Middleware → 
Tenant Context Resolution → Database Query → 
Response (JSON)
```

### Authentication Flow

1. **Login**: User credentials → MongoDB validation → JWT generation
2. **Token Storage**: JWT stored in HTTP-only cookie + Authorization header
3. **Request Validation**: Middleware verifies JWT on each request
4. **Token Revocation**: Single active session enforcement via MongoDB blacklist
5. **Logout**: Token added to blacklist, cookie cleared

### Database Query Pattern

```typescript
// All queries automatically scoped to tenant
const tenantId = await requireTenantIdFromRequest(request);
const leads = await db.select()
  .from(leads)
  .where(and(
    eq(leads.tenantId, tenantId),
    eq(leads.stage, 'Contacted')
  ));
```

---

## 🔐 Authentication & Security

### JWT-Based Authentication

- **Token Generation**: JWT with 24-hour expiration
- **Token Payload**: `userId`, `email`, `role`, `tenantSubdomain`
- **Token Storage**: HTTP-only cookies + Authorization header
- **Token Validation**: Middleware validates on every request

### Security Features

1. **Single Active Session**: Only one active session per user
   - New login revokes all previous tokens
   - Active session detection (2-hour window)
   - User confirmation required for concurrent logins

2. **Token Blacklist**: MongoDB collection for revoked tokens
   - Prevents token reuse after logout
   - TTL index for automatic cleanup

3. **Tenant Scoping**: Tokens scoped to tenant subdomain
   - Prevents cross-tenant access
   - Middleware enforces tenant matching

4. **Password Security**: Passwords stored (consider hashing in production)

5. **CORS Protection**: Configured for specific origins

6. **SSL/TLS**: All database connections use SSL
   - AWS RDS requires SSL
   - MongoDB Atlas uses TLS

### Session Management

- **Last Login Tracking**: MongoDB `users.lastLogin` field
- **Last Logout Tracking**: MongoDB `users.lastLogout` field
- **Active Session Detection**: Checks if login was within 2 hours and after last logout
- **Automatic Revocation**: All tokens revoked on new login

---

## 🚀 Deployment

### Production Deployment

#### Application Hosting: Vercel

- **Platform**: Vercel (Next.js optimized)
- **Region**: Mumbai (ap-south-1)
- **Deployment Method**: Git-based automatic deployments
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Node Version**: Latest LTS (20.x)

**Vercel Configuration:**
- Automatic HTTPS/SSL
- Edge Network for global CDN
- Serverless function execution
- Automatic scaling
- Environment variable management

#### Database Hosting

**MongoDB Atlas:**
- **Provider**: MongoDB Atlas
- **Region**: Mumbai (ap-south-1)
- **Cluster Type**: M10 or higher (production)
- **Backup**: Automated daily backups
- **Monitoring**: Atlas monitoring and alerts

**PostgreSQL (AWS RDS):**
- **Provider**: AWS RDS for PostgreSQL
- **Engine**: PostgreSQL 15.x
- **Instance Type**: db.t3.medium or higher
- **Region**: Mumbai (ap-south-1)
- **Multi-AZ**: Enabled for high availability
- **Backup**: Automated daily snapshots (7-day retention)
- **SSL**: Required for all connections
- **Connection Pooling**: Configured via `pg` Pool

#### Static File Storage: AWS S3

- **Bucket**: Dedicated S3 bucket for static assets
- **Region**: Mumbai (ap-south-1)
- **Storage Class**: Standard
- **Access**: Private with signed URLs or public read for specific prefixes
- **Use Cases**:
  - Tenant logos (`/logos/{tenantId}/logo.{ext}`)
  - User uploads
  - Generated reports
  - Exported data files

**S3 Configuration:**
- Versioning: Enabled
- Lifecycle policies: Archive old files after 90 days
- CORS: Configured for web app domain
- CloudFront: Optional CDN for faster global access

### Deployment Pipeline

1. **Code Push**: Git push to main branch
2. **Vercel Build**: Automatic build triggered
3. **Environment Variables**: Injected from Vercel dashboard
4. **Database Migrations**: Run via script or manual execution
5. **Health Checks**: Vercel verifies deployment
6. **DNS Update**: Automatic (if using Vercel DNS)

### Environment-Specific Configuration

#### Production Environment Variables

```bash
# Database Connections
MONGODB_URI=mongodb+srv://...
PSQL=postgresql://user:pass@rds-endpoint.amazonaws.com/db?sslmode=require
DATABASE_URL=postgresql://user:pass@rds-endpoint.amazonaws.com/db?sslmode=require

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
AWS_S3_BUCKET=trackx-crm-uploads

# JWT
JWT_SECRET=...

# Application
NEXT_PUBLIC_APP_URL=https://wydex.co
NODE_ENV=production

# RDS SSL (if using custom CA)
RDS_CA_BUNDLE_PATH=/path/to/rds-ca-bundle.pem
```

### Database Migration Strategy

1. **Development**: Local PostgreSQL + MongoDB
2. **Staging**: Separate staging databases
3. **Production**: Production databases with backup before migration

**Migration Commands:**
```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate

# Push schema changes (dev only)
npm run db:push
```

---

## 🌐 Infrastructure

### Regional Deployment (Mumbai)

All services are deployed in the **Mumbai (ap-south-1)** region for optimal latency:

- **Vercel**: Mumbai edge location
- **MongoDB Atlas**: Mumbai cluster
- **AWS RDS**: Mumbai region
- **AWS S3**: Mumbai region

### Network Architecture

```
Internet → Vercel Edge (Mumbai) → 
  → MongoDB Atlas (Mumbai) [Sales Data]
  → AWS RDS (Mumbai) [Lead Data]
  → AWS S3 (Mumbai) [Static Files]
```

### Scalability Considerations

1. **Serverless Functions**: Auto-scaling via Vercel
2. **Database Connection Pooling**: Configured for RDS
3. **MongoDB Connection Pooling**: Atlas handles automatically
4. **CDN**: Vercel Edge Network for static assets
5. **Caching**: Implement Redis for frequently accessed data (future)

### Monitoring & Logging

- **Vercel Analytics**: Performance and usage metrics
- **MongoDB Atlas Monitoring**: Database performance
- **AWS CloudWatch**: RDS and S3 metrics
- **Application Logs**: Vercel function logs

---

## 💻 Development Setup

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- PostgreSQL 15+ (local or remote)
- MongoDB (local or Atlas)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/WydexMedia/TrackX_CRM.git
cd TrackX_CRM

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Set up local databases or configure remote connections
```

### Environment Variables

Create `.env.local` file:

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/trackx
# Or MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/db

# PostgreSQL
PSQL=postgresql://user:password@localhost:5432/trackx
# Or AWS RDS: postgresql://user:pass@rds-endpoint.amazonaws.com/db?sslmode=require
DATABASE_URL=postgresql://user:password@localhost:5432/trackx

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AWS S3 (for production)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
AWS_S3_BUCKET=trackx-crm-uploads

# Optional: RDS SSL Certificate
RDS_CA_BUNDLE_PATH=/path/to/rds-ca-bundle.pem
```

### Database Setup

#### PostgreSQL Setup

```bash
# Run migrations
npm run db:migrate

# Or push schema directly (dev only)
npm run db:push
```

#### MongoDB Setup

```bash
# Create indexes
npm run mongo:indexes
```

### Development Server

```bash
# Start development server with Turbopack
npm run dev

# Open http://localhost:3000
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

---

## 📁 Project Structure

```
trackx/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes (backend)
│   │   │   ├── users/          # User management APIs
│   │   │   ├── tl/             # Team Leader APIs
│   │   │   ├── sales/          # Sales tracking APIs
│   │   │   ├── calls/          # Call management APIs
│   │   │   └── tenants/        # Tenant management APIs
│   │   ├── dashboard/          # Sales agent dashboard
│   │   ├── team-leader/        # Team leader interface
│   │   ├── login/              # Authentication pages
│   │   ├── leaderboard/        # Public leaderboard
│   │   └── page.tsx            # Landing page
│   ├── components/             # React components
│   │   ├── ui/                 # UI primitives (Radix UI)
│   │   └── tasks/              # Task-related components
│   ├── db/                     # Database configuration
│   │   ├── schema.ts           # Drizzle ORM schema
│   │   └── client.ts           # Database client
│   ├── lib/                    # Utility libraries
│   │   ├── authMiddleware.ts   # Authentication middleware
│   │   ├── jwt.ts              # JWT utilities
│   │   ├── tenant.ts           # Tenant utilities
│   │   ├── mongoTenant.ts      # MongoDB tenant context
│   │   ├── mongoClient.js      # MongoDB client
│   │   └── cookies.ts          # Cookie utilities
│   ├── hooks/                  # React hooks
│   │   └── useTenant.ts        # Tenant detection hook
│   ├── utils/                  # Utility functions
│   └── middleware.ts           # Next.js middleware
├── drizzle/                    # Database migrations
├── public/                     # Static assets
│   ├── uploads/                # User uploads (local dev)
│   └── icons/                  # Icon assets
├── scripts/                    # Utility scripts
│   ├── run-migrations.js       # Migration runner
│   ├── setup-mongo-indexes.js  # MongoDB index setup
│   └── create-db.js            # Database creation
├── __tests__/                  # Test files
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── next.config.ts              # Next.js config
├── drizzle.config.ts           # Drizzle ORM config
└── README.md                   # This file
```

---

## 📚 API Documentation

### Authentication Endpoints

#### `POST /api/users/login`
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "sales",
    "tenantSubdomain": "proskill"
  }
}
```

#### `POST /api/users/logout`
Logout and revoke current session.

#### `GET /api/users/current`
Get current authenticated user.

### Lead Management Endpoints

#### `GET /api/tl/leads`
Get leads with filtering and pagination.

**Query Parameters:**
- `stage`: Filter by stage
- `ownerId`: Filter by owner
- `search`: Search by name/phone/email
- `page`: Page number
- `limit`: Results per page

#### `POST /api/tl/leads`
Create a new lead.

#### `PUT /api/tl/leads/[phone]`
Update a lead.

#### `DELETE /api/tl/leads/[phone]`
Delete a lead.

### Task Management Endpoints

#### `GET /api/tl/tasks`
Get tasks with filtering.

#### `POST /api/tl/tasks`
Create a new task.

#### `PUT /api/tl/tasks/[id]`
Update a task.

### Analytics Endpoints

#### `GET /api/tl/analytics`
Get analytics data for team leader dashboard.

#### `GET /api/tl/kpis`
Get KPI metrics.

---

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `PSQL` or `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Secret key for JWT signing | `your-secret-key` |
| `NEXT_PUBLIC_APP_URL` | Public application URL | `https://wydex.co` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `AWS_ACCESS_KEY_ID` | AWS access key for S3 | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for S3 | - |
| `AWS_REGION` | AWS region | `ap-south-1` |
| `AWS_S3_BUCKET` | S3 bucket name | - |
| `RDS_CA_BUNDLE_PATH` | Path to RDS CA certificate | - |
| `PG_MAX_POOL_SIZE` | PostgreSQL pool size | `10` |
| `PG_IDLE_TIMEOUT_MS` | PostgreSQL idle timeout | `10000` |

---

## 📝 License

This project is proprietary software owned by WydexMedia.

---

## 👥 Contributing

This is a private enterprise project. For contributions, please contact the project maintainers.

---

## 📞 Support

For support and inquiries, please contact the development team at WydexMedia.

---

## 🔄 Changelog

### Version 0.1.0
- Initial release
- Multi-tenant architecture
- Lead and task management
- Analytics and reporting
- Team leader dashboard

---

**Built with ❤️ by WydexMedia**
