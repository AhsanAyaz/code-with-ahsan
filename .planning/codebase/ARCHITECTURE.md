# Architecture

**Analysis Date:** 2026-01-23

## Pattern Overview

**Overall:** Layered Next.js 16 full-stack application with API routes, React components, and Firebase backend integration.

**Key Characteristics:**
- Server Components + Client Components (React 19) with selective Client Boundaries
- RESTful API routes via Next.js App Router
- Firebase (Firestore database, Admin SDK, Storage, Authentication)
- Context API for client-side state management (Toast, Theme, Auth, Mentorship)
- Layout-based routing with MDX content integration
- Multi-feature architecture: Blog/Content, Mentorship, Courses, Community

## Layers

**Presentation (UI):**
- Purpose: Render user interfaces and handle client interactions
- Location: `src/components/`, `src/app/`
- Contains: React components (TSX), page layouts, UI wrapper
- Depends on: Context (state), Services (auth, data), Libraries (Firebase client, theme)
- Used by: End users via browser

**API/Route Handlers:**
- Purpose: Process HTTP requests, business logic, external integrations
- Location: `src/app/api/`
- Contains: Next.js route handlers for RESTful endpoints
- Depends on: Firebase Admin SDK, external APIs (Gmail, Discord, Mailgun)
- Used by: Client-side components via fetch, third-party services via webhooks

**State Management:**
- Purpose: Share data across components without prop drilling
- Location: `src/contexts/`
- Contains: React Context providers (ToastContext, AuthContext, MentorshipContext)
- Depends on: Firebase Auth, API routes
- Used by: Components that need global state (auth status, toast notifications, mentorship data)

**Data Access:**
- Purpose: Manage database operations and external service communication
- Location: `src/lib/` (Firebase initialization, Discord service, Email service)
- Contains: Firebase Admin SDK initialization, service modules for integrations
- Depends on: Environment variables, Firebase credentials
- Used by: API route handlers

**Services/Utilities:**
- Purpose: Shared business logic and reusable functionality
- Location: `src/services/`, `src/lib/utils/`
- Contains: Auth utilities (Firebase), YouTube utilities, formatters, helpers
- Depends on: Firebase SDK, external libraries
- Used by: Components, API routes, other services

**Configuration/Metadata:**
- Purpose: Centralized configuration and site metadata
- Location: `src/data/` (siteMetadata, headerNavLinks, booksData)
- Contains: Static configuration, navigation structure, site constants
- Depends on: Environment variables (for analytics, comments, newsletter)
- Used by: Components, layouts, root layout

**Type System:**
- Purpose: TypeScript type definitions for domain models
- Location: `src/types/mentorship.ts`
- Contains: Interfaces for MentorshipProfile, MentorshipMatch, roles
- Depends on: None
- Used by: Context, API routes, components

## Data Flow

**Authentication Flow:**

1. User initiates login in `LoginModal` component
2. `AuthService.js` uses Firebase client to authenticate (GitHub/Google)
3. Firebase Auth state updates via `onAuthStateChanged`
4. `MentorshipContext` syncs user state and fetches mentorship profile via `/api/mentorship/profile?uid=`
5. Profile data hydrates context, components render conditionally based on role/status

**Mentorship Match Flow:**

1. User submits request via mentorship component
2. POST to `/api/mentorship/requests` creates record in Firestore
3. Admin approves via admin dashboard (separate auth)
4. Approval triggers `/api/mentorship/match` endpoint
5. Match creation spawns Discord channel via `discord.ts` service
6. Discord channel link stored in Firestore `MentorshipMatch` document
7. Both users notified via email and Discord DM

**API Data Fetch Flow:**

1. Components use `fetch()` client-side to call API routes
2. API routes query Firestore via Firebase Admin SDK
3. Results transformed and returned as JSON
4. Components update state via useState or context, triggering re-render

**Content/CMS Flow:**

1. Blog posts stored as MDX files in filesystem (legacy approach)
2. Home page fetches banners from Strapi CMS via `/api/banners` route
3. Route queries external Strapi instance (or returns empty gracefully)
4. MDX bundled via `mdx-bundler` for syntax highlighting

## Key Abstractions

**Context Providers:**
- Purpose: Encapsulate global state and UI behaviors
- Examples: `ToastContext` (notifications), `AuthContext` (login modal), `MentorshipContext` (profile/matches)
- Pattern: React.createContext + useContext hook pattern with provider component

**API Route Handlers:**
- Purpose: Implement CRUD operations for Firebase collections
- Examples: `src/app/api/mentorship/profile/route.ts` (GET/POST/PUT user profile)
- Pattern: Next.js route handler with method-specific exports (GET, POST, PUT, DELETE)

**Service Modules:**
- Purpose: Encapsulate external integrations
- Examples: `src/lib/discord.ts` (Discord Bot API), `src/lib/email.ts` (Mailgun/Gmail)
- Pattern: Named functions for each capability, centralized error handling and logging

**Layout Components:**
- Purpose: Wrap page content with consistent structure
- Examples: `CoursePostLayout` (for course posts with MDX), `AuthorLayout` (for author bios)
- Pattern: Higher-order component pattern or wrapper component

## Entry Points

**Application Root:**
- Location: `src/app/layout.tsx`
- Triggers: Every page load
- Responsibilities: Initialize Providers (Theme, Toast, Auth, Mentorship), load global CSS, set up Analytics component

**Homepage:**
- Location: `src/app/page.tsx`
- Triggers: GET /
- Responsibilities: Fetch banners from CMS, render Hero, Features, Newsletter signup, inject promotional banners

**API Routes:**
- Location: `src/app/api/[feature]/[...path]/route.ts`
- Triggers: HTTP requests to `/api/*`
- Responsibilities: Handle CRUD, validate requests, query Firebase, call external services (Discord, Email)

**Mentorship Pages:**
- Location: `src/app/mentorship/[...pages]`
- Triggers: Navigation to /mentorship/*
- Responsibilities: Render mentorship dashboard, profile management, match listings

## Error Handling

**Strategy:** Graceful degradation with user notification via Toast context

**Patterns:**
- API routes: Return 400/404/500 with `{ error: message }` JSON structure
- Components: Catch errors in try-catch, call `useToast().error()` to display message
- Firebase operations: Wrap in try-catch, log errors to console, inform user via toast
- External service failures: Gracefully return empty data or defaults (e.g., `getBanners()` returns `[]` on Strapi failure)

## Cross-Cutting Concerns

**Logging:** Winston logger initialized in `src/lib/logger.ts`, used by Discord and Email services for request/response tracking

**Validation:** Input validation in API routes (email format, username format, uid presence), firestore data transformation (e.g., converting Firestore timestamps to JS Date)

**Authentication:** Firebase Auth for end users (client-side), Firebase Admin SDK with service account for server-side operations, admin routes check custom claims (future enhancement)

---

*Architecture analysis: 2026-01-23*
