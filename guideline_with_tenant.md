## Design Principles & Architecture Rules
SOLID Principles
DRY (Don’t Repeat Yourself)
KISS (Keep It Simple, Stupid)
YAGNI (You Aren’t Gonna Need It)
Avoid tight coupling
Keep everything decoupled
Business Logic MUST be Outside Views
Use services layer
Keep everything decoupled

## Data Modeling & Domain Design Principles
Profile = static info
Plan = versioned (history matters)
Check-ins = time-series data
Never overwrite plans.
When updating plan deactivate old and create new
Extensible schema → avoid rigid columns for plans/forms
Auditability → track progress/history
Performance → avoid heavy joins in dashboards
Time-Series Data Strategy
Check-ins will explode in size.
Use Aggregation queries (weekly avg, trends) for analytics
Metrics You MUST Track
Weight change %
Adherence %
Drop-off rate
Avg fat loss/week

## Multi-Tenancy & Access Control
Multi-tenancy → each coach/gym has isolated data
Permission are global and roles are scoped by organization_id
Every query must be scoped by organization_id
Multi tenancy is Subdomain-based (Recommended for SaaS)
org1.yourapp.com → org1
org2.yourapp.com → org2

## Async, Background Jobs & Performance
For async task use celery and redis like weekly reports etc
Performance → avoid heavy joins in dashboards

## Core Entities (RBAC & Users)
👤 3.1 User & Roles
User
id
email (unique)
password
is_active
created_at
Role
id
name (Admin, Coach, Client)
UserRole
user (FK)
role (FK)
👉 Use RBAC instead of hardcoding roles → scalable

## Organization (Multi-Tenant Models)
🏢 3.2 Organization (Multi-Tenant)
Organization
id
name
owner (FK User)
created_at
OrganizationMember
user (FK)
organization (FK)
role (Admin/Coach)
👉 Every query must be scoped by organization_id

## Tech Stack
Tech used
Frontend → Next.js 16.2.3
Backend → Django 5.2.13 LTS + DRF 3.10
DB → PostgreSQL
Storage → Cloudflare R2
Auth: dj-rest-auth + allauth + JWT
Queue → Celery + Redis

## Core Domain Models
Core domain models
Tenant/organization - SaaS customer (a gym or brand).
OrganizationMember - Map User with tenant
User — All users
Staff — staff for the tenant (owner/coach/trainer).
Client — actual gym member / online client (belongs to Tenant).
Order - Order Details and Invoices
Packages — Gold/Platinum/Silver, start_date, end_date, package.
Coupon -
CheckIn - For daily Checkins
Measurement — timestamped body measurements.
Meal Planning — meal plan templates.
Meal Tracking - meals recorded by client; calories & macros breakdown.
Workout Planning - workout plan templates.
Workout Tracking - per client exercise log entries.
Reports - Blood Reports
Communications - Email Templates, Whatsapp Templates
Notification — messages queued to client (email/push/SMS).
Promo — promotions/campaigns (email/SMS).
Followups - Followups with customer
Payment — Stripe charge/subscription records, status.
Support - For Support Tickets
AuditLog — critical action audit entries.
Analytics - Reports, charts, KPIs
progress - Client metrics, transformations, etc.

## Additional Tables
##Additional table
FoodItem references a food catalog or free text with nutritional values.
ExerciseTemplate references exercise details from db.

## Roles & Access Control
Roles:
Superadmin ()
Admin(owner of organization)
Staff(staff of organization)
Client (customer of organization)
Access control:
Coach sees only their clients
Clients see only their data

## API Design & URL Structure
URLs structure
/api/v1/...
Avoid flat chaos. Use hierarchy only where it makes sense:
/api/v1/organizations/{org_id}/clients/
/api/v1/clients/{client_id}/checkins/
/api/v1/clients/{client_id}/plans/
Query-Based Filtering (NOT separate endpoints)
/api/v1/checkins/?user_id=123
/api/v1/checkins/?date__gte=2026-01-01
/api/v1/checkins/?week=2026-W15
Version your API and Use pagination everywhere

## Frontend Architecture (Next.js)
Frontend (Next.js) URL Structure
Using App Router:
Role-based Views
/admin/*
/coach/*
/client/*
Use centralized API layer:
/lib/api.ts
/services/clientService.ts
/services/checkinService.ts

## Frontend Admin Structure
Frontend Admin
frontend_admin/src/app/: Next.js App Router providing page layouts and routing (e.g., (dashboard)).
frontend_admin/src/components/: Reusable React components.
ui/: Generic, atomic UI components (buttons, inputs, modals).
layout/: Layout-specific components (Sidebar, Header).
features/: Complex components grouped by domain (e.g., staff, clients).
frontend_admin/src/hooks/: Custom React hooks (e.g., specific useQuery hooks).
frontend_admin/src/lib/: Third-party library configurations (e.g., axios, queryClient).
frontend_admin/src/services/: API client functions that call the backend endpoints.
frontend_admin/src/store/: Global state management configuration (if using Zustand/Redux).
frontend_admin/src/types/: TypeScript interface and type definitions.
frontend_admin/src/utils/: Pure utility and helper functions.
frontend_admin/public/: Static assets (images, icons).

## Frontend User Structure
Frontend User
frontend_user/src/app/: Next.js App Router for public pages and user portal.
frontend_user/src/components/:
ui/: Generic UI components.
layout/: Site layouts (Navbar, Footer).
features/: User-specific feature components (e.g., profile, shop).
frontend_user/src/hooks/: Custom React hooks.
frontend_user/src/lib/: Third-party setups.
frontend_user/src/services/: API client setups.
frontend_user/src/types/: TypeScript definitions.
frontend_user/src/utils/: Helper functions.
frontend_user/public/: Public static assets.

## Database Design Guide
Multi-tenancy → each coach/gym has isolated data
Extensible schema → avoid rigid columns for plans/forms
Auditability → track progress/history
Performance → avoid heavy joins in dashboards
Every query must be scoped by organization_id
Instead of fixed columns → use JSON (VERY IMPORTANT)
Use UUIDs (not auto IDs)
id = UUIDField(primary_key=True)  

Add Indexes
Soft Deletes
Denormalization (for dashboards)
Add fields like:
Client
current_weight
last_checkin_date
Avoid heavy joins on dashboards

## User Journeys
User Journeys
Client Journey (Most Important)
Step-by-step flow:
Signup/Login
Purchase Plan
Fill Fitness Form
Coach Assigned (Auto/Manual)
Plan Generated
Dashboard Access
Daily Usage
View diet/workout
Update progress
Weekly Check-in
Support (if needed)
Renew / Upgrade Plan

## Coach Journey
Coach Journey
Login
View assigned clients
Open client profile
Analyze:
Form data
Progress
Create/update plans
Communicate with client
Track performance

## Admin Journey
Admin Journey
Monitor dashboard (KPIs)
Manage users
Assign coaches
Handle payments/issues
View reports

## Support Journey
##Support Journey
Receive ticket
View user context
Respond / resolve
Close ticket

## Backend Engineering Rules
Use viewsets + routers to keep DRY.
Shared component library (monorepo package) for design system.

## Security
Sentry for exceptions.
Rate limiting per tenant/user (DRF throttling).
Audit logs for owner-level actions.
Password hashing: Argon2 or PBKDF2.
TLS everywhere, secure cookies, CSP headers.

## Testing & CI
Backend tests: unit tests for models, serializers, permissions, and integration tests for API endpoints. Add tenant-specific tests to ensure isolation.
Contract tests: OpenAPI/Swagger; consider Pact for consumer-driven contracts between frontend and backend.
CI: run linters (flake8/black/isort), type checks (mypy), unit tests, integration tests, then deploy on success.
Load testing: Locust to test scaling behavior.
Frontend tests: Jest + React Testing Library for components, Playwright for E2E.

## Frontend Core Rules
Core Rules (Non-Negotiables)
Use App Router only (no pages router)
Use Server Components by default
Use Client Components ONLY when needed (state, events)
All API calls go through service layer (no direct fetch in components)
No business logic inside UI components
TypeScript strict mode enabled

## Frontend Project Structure
Project Structure (very important)
/app
/(auth)
/(dashboard)
layout.tsx
page.tsx
/components
/ui # reusable (buttons, inputs)
/shared # shared across modules
/features # feature-specific
/lib
api.ts
fetcher.ts
/services
user.service.ts
auth.service.ts
/hooks
useAuth.ts
/types
user.ts

## API Communication Rules
API Communication Rules
Use centralized API client (lib/api.ts)
Always include auth token via middleware/interceptor
Use async/await (no .then chains)
Standard response format:
{
success: boolean;
data: T;
error?: string;
}

## State Management Strategy
State Management Strategy
Use React Server Components for data fetching
Use useState only for local UI state
Use Zustand for global state (if needed)
Avoid Redux unless explicitly required

## Data Fetching Rules
📦 Data Fetching Rules (Next.js 16)
Prefer server-side data fetching in route segments
Use fetch with cache control:
fetch(url, { cache: 'no-store' }) for dynamic data
fetch(url, { next: { revalidate: 60 } }) for ISR
Avoid client-side fetching unless necessary

## Auth Handling
Auth Handling
Store tokens in HTTP-only cookies
Do not store tokens in localStorage
Use middleware.ts for route protection
Redirect unauthenticated users to /login

## Component Guidelines
Component Guidelines
Keep components small and focused
Separate UI and logic
Use props interfaces (TypeScript)
No inline styles (use Tailwind)

## Styling Rules
Styling Rules
Use Tailwind CSS
Use class-variance-authority (CVA) for variants
Avoid inline CSS
Use design tokens (colors, spacing)

## Performance Rules (Frontend)
Performance Rules
Use dynamic imports for heavy components
Avoid unnecessary client components
Use Image component for images
Avoid large dependency libraries

## Error Handling & UX
Error Handling & UX
Show loading states (skeletons)
Handle API errors gracefully
Use error boundaries

## Forms Handling
Forms Handling
Use react-hook-form
Use Zod for validation
Keep validation schema separate

## Naming Conventions
Naming Conventions
Components: PascalCase
Hooks: useSomething
Services: something.service.ts
Types: something.type.ts

## Anti-Patterns
Anti-Patterns (VERY IMPORTANT)
Do NOT fetch data inside deeply nested components
Do NOT mix server/client logic
Do NOT duplicate API calls
Do NOT hardcode URLs
Do NOT use any without type

## Backend Integration Contract
Backend Integration Contract
Base URL comes from env
All endpoints follow /api/v1/
Use JWT auth
Handle 401 globally (logout user)

models/       → DB schema
selectors/    → read queries
services/     → business logic (writes)
api/          → DRF layer (views, serializers, permissions, urls)
tasks.py      → async jobs (optional)
signals.py    → optional

core/
  tenants/
    models/
    selectors/
    services/
    api/
      views.py
      serializers.py
      permissions.py
      urls.py

  accounts/
    models/
    selectors/
    services/
    api/
      views.py
      serializers.py
      permissions.py
      urls.py
	  
clients/
  models/
  selectors/
  services/
  api/
    views.py
    serializers.py
    permissions.py
    urls.py

staff/
  models/
  selectors/
  services/
  api/
    views.py
    serializers.py
    permissions.py
    urls.py
	
workout/
  models/
    planning.py
    tracking.py

  selectors/
    plans.py
    tracking.py

  services/
    planning.py
    tracking.py

  api/
    views/
      planning.py
      tracking.py
    serializers/
      planning.py
      tracking.py
    permissions.py
    urls.py	
	
meal/
  models/
	planning.py
    tracking.py
  selectors/
  services/

  api/
    views.py
    serializers.py
    permissions.py
    urls.py

progress/
  models/
	checkins.py
    measurements.py

  selectors/
    checkins.py
    measurements.py

  services/
    checkins.py
    measurements.py

  api/
    views.py
    serializers.py
    permissions.py
    urls.py

billing/
  models/
	catalog.py        # Package
    subscriptions.py  # Subscription
    orders.py         # Order, Invoice
    payments.py       # Payment, PaymentEvent
    coupons.py        # Coupon, CouponRedemption
  selectors/
    subscriptions.py
    payments.py
    orders.py

  services/
    subscriptions.py
    payments.py
    orders.py

  api/
    views/
      subscriptions.py
      payments.py
      orders.py
    serializers/
      subscriptions.py
      payments.py
      orders.py
    permissions.py
    urls.py

  webhooks/
    stripe.py

  tasks.py

engagement/
  models/
	templates.py        # MessageTemplate
    messages.py         # MessageLog
    notifications.py    # Notification
    campaigns.py        # Campaign, CampaignRecipient
    crm.py              # Lead, FollowUp, Interaction
  selectors/
    campaigns.py
    crm.py

  services/
    campaigns.py
    messaging.py

  api/
    views.py
    serializers.py
    permissions.py
    urls.py

  tasks.py   # async messaging, campaigns

health/
  models/
	reports.py      # BloodReport, File uploads
  selectors/
  services/

  api/
    views.py
    serializers.py
    permissions.py
    urls.py

operations/
  models/
	support.py      # SupportTicket
    audit.py        # AuditLog
  selectors/
  services/

  api/
    views.py
    serializers.py
    permissions.py
    urls.py

insights/
  models/
	aggregates.py   # Precomputed stats (optional)
  selectors/
    dashboards.py

  services/
    aggregations.py

  api/
    views.py
    serializers.py
    urls.py

