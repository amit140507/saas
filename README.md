## Design Principle to follow
SOLID Principles
DRY (Don’t Repeat Yourself)
KISS (Keep It Simple, Stupid)
YAGNI (You Aren’t Gonna Need It)
Avoid tight coupling
Keep everything decoupled
Business Logic MUST be Outside Views
Never overwrite plans.
Version your API
Use services layer


## Tech used
Frontend →  Next.js 16.2.3
Backend → Django 5.2.13 LTS + DRF 3.10
DB → PostgreSQL
Storage → Cloudflare R2
Auth: dj-rest-auth + allauth + JWT
Queue → Celery + Redis

## Core domain models
Tenant/organization - SaaS customer (a gym or brand).
OrganizationMember - Map User with tenant
User — All users 
Staff  — staff for the tenant (owner/coach/trainer).
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
Communications -  Email Templates, Whatsapp Templates
Notification — messages queued to client (email/push/SMS).
Promo — promotions/campaigns (email/SMS).
Followups - Followups with customer
Payment — Stripe charge/subscription records, status.
Support - For Support Tickets
AuditLog — critical action audit entries.
Analytics - Reports, charts, KPIs
progress -  Client metrics, transformations, etc.

##Additional table
FoodItem references a food catalog or free text with nutritional values.
ExerciseTemplate references exercise details from db.


## Roles:
Superadmin ()
Admin(owner of organization)
Staff(staff of organization)
Client (customer of organization)
Access control:
Coach sees only their clients
Clients see only their data

## URLs structure
/api/v1/...
# Avoid flat chaos. Use hierarchy only where it makes sense:
/api/v1/organizations/{org_id}/clients/
/api/v1/clients/{client_id}/checkins/
/api/v1/clients/{client_id}/plans/
# Query-Based Filtering (NOT separate endpoints)
/api/v1/checkins/?user_id=123
/api/v1/checkins/?date__gte=2026-01-01
/api/v1/checkins/?week=2026-W15

## Frontend (Next.js) URL Structure
# Using App Router:
# Role-based Views
/admin/*
/coach/*
/client/*
# Use centralized API layer:
/lib/api.ts
/services/clientService.ts
/services/checkinService.ts


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


## DB design guide 
# Multi-tenancy → each coach/gym has isolated data
# Extensible schema → avoid rigid columns for plans/forms
# Auditability → track progress/history
# Performance → avoid heavy joins in dashboards
# Every query must be scoped by organization_id
# Instead of fixed columns → use JSON (VERY IMPORTANT)
# Use UUIDs (not auto IDs)
    id = UUIDField(primary_key=True)
# Add Indexes
# Soft Deletes


## Core Roles for Your Fitness SaaS
# Client Journey (Most Important)
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
Monitor dashboard (KPIs)
Manage users
Assign coaches
Handle payments/issues
View reports

# Use viewsets + routers to keep DRY.
# Shared component library (monorepo package) for design system.

# Subdomain-based (Recommended for SaaS)


### Frontend

## Core Rules (Non-Negotiables)
- Use App Router only (no pages router)
- Use Server Components by default
- Use Client Components ONLY when needed (state, events)
- All API calls go through service layer (no direct fetch in components)
- No business logic inside UI components
- TypeScript strict mode enabled

## Project Structure (very important)

/app
  /(auth)
  /(dashboard)
  layout.tsx
  page.tsx

/components
  /ui        # reusable (buttons, inputs)
  /shared    # shared across modules
  /features  # feature-specific

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
- Use centralized API client (lib/api.ts)
- Always include auth token via middleware/interceptor
- Use async/await (no .then chains)
- Standard response format:
{
  success: boolean;
  data: T;
  error?: string;
}

## State Management Strategy
- Use React Server Components for data fetching
- Use useState only for local UI state
- Use Zustand for global state (if needed)
- Avoid Redux unless explicitly required
5. 📦 Data Fetching Rules (Next.js 16)
- Prefer server-side data fetching in route segments
- Use fetch with cache control:
fetch(url, { cache: 'no-store' }) for dynamic data
fetch(url, { next: { revalidate: 60 } }) for ISR
- Avoid client-side fetching unless necessary

## Auth Handling
- Store tokens in HTTP-only cookies
- Do not store tokens in localStorage
- Use middleware.ts for route protection
- Redirect unauthenticated users to /login

## Component Guidelines
- Keep components small and focused
- Separate UI and logic
- Use props interfaces (TypeScript)
- No inline styles (use Tailwind)

## Styling Rules
- Use Tailwind CSS
- Use class-variance-authority (CVA) for variants
- Avoid inline CSS
- Use design tokens (colors, spacing)

## Performance Rules
- Use dynamic imports for heavy components
- Avoid unnecessary client components
- Use Image component for images
- Avoid large dependency libraries

## Error Handling & UX
- Show loading states (skeletons)
- Handle API errors gracefully
- Use error boundaries

## Forms Handling
- Use react-hook-form
- Use Zod for validation
- Keep validation schema separate

## Naming Conventions
- Components: PascalCase
- Hooks: useSomething
- Services: something.service.ts
- Types: something.type.ts

## Anti-Patterns (VERY IMPORTANT)
- Do NOT fetch data inside deeply nested components
- Do NOT mix server/client logic
- Do NOT duplicate API calls
- Do NOT hardcode URLs
- Do NOT use any without type

## Backend Integration Contract
- Base URL comes from env
- All endpoints follow /api/v1/
- Use JWT auth
- Handle 401 globally (logout user)