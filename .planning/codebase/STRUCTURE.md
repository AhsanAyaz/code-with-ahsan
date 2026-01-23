# Codebase Structure

**Analysis Date:** 2026-01-23

## Directory Layout

```
code-with-ahsan/
├── src/                                # Application source code
│   ├── app/                            # Next.js 16 App Router pages and layouts
│   │   ├── api/                        # RESTful API route handlers
│   │   ├── (feature-pages)/            # Public feature pages (about, books, courses, etc.)
│   │   ├── mentorship/                 # Mentorship feature pages
│   │   ├── layout.tsx                  # Root layout with Providers
│   │   ├── page.tsx                    # Homepage
│   │   └── globals.css                 # Global styles
│   ├── components/                     # Reusable React components
│   │   ├── mentorship/                 # Mentorship-specific components
│   │   ├── analytics/                  # Analytics/tracking components
│   │   ├── courses/                    # Course-related components
│   │   ├── comments/                   # Comment/discussion components
│   │   ├── (feature-components)/       # Feature-specific UI components
│   │   └── (generic)/                  # Shared components (Button, Card, Dialog, etc.)
│   ├── contexts/                       # React Context providers
│   │   ├── ToastContext.tsx            # Toast notification provider
│   │   ├── MentorshipContext.tsx       # Mentorship data provider
│   │   └── AuthContext.tsx             # Auth modal state provider
│   ├── lib/                            # Core business logic and services
│   │   ├── discord.ts                  # Discord Bot API integration
│   │   ├── email.ts                    # Email service (Mailgun/Gmail)
│   │   ├── firebaseAdmin.ts            # Firebase Admin SDK initialization
│   │   ├── logger.ts                   # Winston logger setup
│   │   ├── mentorship-*.ts             # Mentorship helpers/constants
│   │   ├── utils/                      # Utility functions (formatters, helpers)
│   │   └── (mdx, strapi)/              # Content pipeline utilities
│   ├── services/                       # Service layer (older pattern)
│   │   ├── AuthService.js              # Firebase client auth
│   │   ├── CourseService.js            # Course data operations
│   │   ├── YouTubeService.js           # YouTube API integration
│   │   └── (misc)/                     # Enrollment, comments, storage
│   ├── types/                          # TypeScript type definitions
│   │   └── mentorship.ts               # Mentorship domain types
│   ├── data/                           # Static data and configuration
│   │   ├── siteMetadata.js             # Site config (title, socials, analytics)
│   │   ├── headerNavLinks.js           # Navigation menu structure
│   │   ├── booksData.js                # Books listing
│   │   ├── projectsData.js             # Projects listing
│   │   ├── authors/                    # Author profiles
│   │   ├── people/                     # Mentor/community member profiles
│   │   └── events/                     # Event data
│   ├── layouts/                        # Layout HOCs for pages
│   │   ├── CoursePostLayout.js         # Wrapper for course posts with MDX
│   │   ├── AuthorLayout.js             # Author bio layout
│   │   └── SimpleLayout.js             # Basic page layout
│   └── css/                            # Custom stylesheets
├── public/                             # Static assets served as-is
│   ├── images/                         # Image files
│   ├── static/                         # Fonts, favicons, downloadables
│   └── *.ico                           # Site icons
├── scripts/                            # Build and utility scripts
│   ├── custom/                         # Custom scripts (Discord tools, etc.)
│   └── generate-sitemap.js             # Post-build sitemap generation
├── secure/                             # Secrets and local credentials (gitignored)
│   └── *.json                          # Firebase service account JSON
├── .planning/                          # GSD planning documents
│   └── codebase/                       # Architecture/structure analysis docs
├── .env.local                          # Local environment variables (gitignored)
├── .env.example                        # Environment variable template
├── package.json                        # Dependencies and build scripts
├── tsconfig.json                       # TypeScript configuration
├── next.config.js                      # Next.js configuration
└── tailwind.config.js                  # Tailwind CSS configuration
```

## Directory Purposes

**src/app/api:**
- Purpose: REST API endpoints for client-side and third-party consumption
- Contains: Route handler files organized by feature (mentorship, youtube, mailchimp, etc.)
- Key files:
  - `src/app/api/mentorship/` - 12+ endpoints for mentor/mentee operations (profile, matches, ratings, requests)
  - `src/app/api/mentorship/announcement-image/` - Image generation endpoints
  - `src/app/api/banners/` - CMS integration for promotional banners
  - `src/app/api/user-progress/` - Learning progress tracking
  - `src/app/api/youtube/comments/` - YouTube comment integration

**src/app/mentorship:**
- Purpose: Mentorship feature pages and nested layouts
- Contains: Page components for mentor/mentee dashboards, profile management, match listings
- Routes: /mentorship, /mentorship/find-mentor, /mentorship/dashboard, etc.

**src/components/mentorship:**
- Purpose: Reusable mentorship UI components
- Contains: Match cards, profile forms, status badges, session scheduling UI
- Usage: Rendered in mentorship pages and dashboards

**src/lib:**
- Purpose: Core application logic and external integrations
- Key modules:
  - `firebaseAdmin.ts` - Firebase Admin SDK with multi-auth strategy (service account, ADC, or local dev)
  - `discord.ts` - Create channels, send DMs, manage permissions
  - `email.ts` - Mailgun and Gmail integration for transactional emails
  - `logger.ts` - Structured logging with Winston

**src/contexts:**
- Purpose: React Context providers for global state
- Pattern: Each context exports Provider component and useXxx hook
- Usage: Wrap Providers in root layout, use hook in components marked "use client"

**src/types/mentorship.ts:**
- Purpose: Single source of truth for mentorship domain types
- Contains: MentorshipProfile, MentorshipMatch, PublicMentor, RequestStatus types
- Imported by: API routes, context, components

**src/data:**
- Purpose: Configuration and static data
- Key files:
  - `siteMetadata.js` - Site title, author, analytics IDs, comment provider config
  - `headerNavLinks.js` - Main navigation menu structure (exported as header + community dropdown)
  - `booksData.js`, `projectsData.js` - Content listings
  - `people/` - Directory of mentors/contributors

**src/services:**
- Purpose: Older service layer pattern (mixing client and server code)
- Status: Being phased out in favor of API routes + Contexts
- Contains: AuthService (Firebase client), CourseService, YouTubeService

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx` - Root layout, initializes all Providers
- `src/app/page.tsx` - Homepage with banner fetching and feature sections
- `src/app/providers.tsx` - Provider initialization (Theme, Toast, Auth, Firebase client, Cookie consent)

**Configuration:**
- `package.json` - Next.js 16, React 19, Firebase, MDX tooling, Tailwind 4, TypeScript 5
- `tsconfig.json` - TypeScript configuration (strict mode)
- `next.config.js` - Next.js behavior (MDX support, image optimization)
- `src/data/siteMetadata.js` - Analytics, newsletter provider, comment provider config

**Core Logic:**
- `src/lib/firebaseAdmin.ts` - Firebase initialization (checks env vars, local dev cert, ADC)
- `src/lib/discord.ts` - Discord Bot integration (channel creation, member lookup, rate limit handling)
- `src/lib/email.ts` - Email templates and sending logic (Mailgun/Gmail)
- `src/contexts/MentorshipContext.tsx` - Mentorship data syncing and auth flow

**Testing:**
- Test files not found in src/ (integration testing via API routes and manual testing)

## Naming Conventions

**Files:**
- `.tsx` - React components (use client components)
- `.ts` - TypeScript modules (services, utilities, types)
- `.js` - Legacy JavaScript (utilities, MDX config)
- API routes: `route.ts` (or `.tsx` for image generation endpoints)
- Page components: `page.tsx`
- Layout components: `layout.tsx`
- Context: `*Context.tsx` (e.g., `ToastContext.tsx`)

**Directories:**
- Feature directories: lowercase with hyphens (e.g., `mentorship`, `logic-buddy`, `announcement-image`)
- Component directories: PascalCase matching feature area (e.g., `mentorship/`, `analytics/`)
- Utility directories: lowercase plurals (e.g., `utils/`, `lib/utils/`)

**Components:**
- PascalCase filenames (e.g., `LayoutWrapper.tsx`, `ProfileMenu.tsx`)
- Lowercase for utility components (e.g., `pre.tsx` for code blocks)

**Functions:**
- camelCase for exports (e.g., `getBanners()`, `sendAdminMentorPendingEmail()`)
- UPPER_CASE for constants (e.g., `DISCORD_API`, `STRAPI_URL`)

**Types:**
- PascalCase interfaces and types (e.g., `MentorshipProfile`, `ToastType`)

## Where to Add New Code

**New Feature:**
- Primary code: `src/app/[feature-name]/` for pages, `src/app/api/[feature-name]/` for endpoints
- Components: `src/components/[feature-name]/`
- Types: Add to `src/types/` or inline if feature-specific
- Tests: Collocate with API route if testing business logic

**New Component/Module:**
- Shared component: `src/components/[ComponentName].tsx`
- Feature-specific component: `src/components/[feature-name]/[ComponentName].tsx`
- Service/utility: `src/lib/[service-name].ts` (if external integration) or `src/lib/utils/[utility-name].ts` (if helper)

**Utilities:**
- Shared helpers: `src/lib/utils/[name].js` (existing pattern)
- Feature-specific helpers: `src/lib/[feature]-[purpose].ts` (e.g., `mentorship-templates.ts`)

**Context Provider:**
- New global state: `src/contexts/[FeatureName]Context.tsx`
- Export provider component and useXxx hook
- Wrap in Providers component in `src/app/providers.tsx`

**API Endpoint:**
- RESTful route: `src/app/api/[resource]/route.ts` (for collection) or `src/app/api/[resource]/[id]/route.ts` (for item)
- Nested resource: `src/app/api/[resource]/[id]/[sub-resource]/route.ts`
- Export named functions: GET, POST, PUT, DELETE, PATCH as needed

## Special Directories

**secure/:**
- Purpose: Store Firebase service account JSON and other secrets locally
- Generated: No (created manually during setup)
- Committed: No (gitignored, never commit credentials)
- Contains: `code-with-ahsan-45496-firebase-adminsdk-*.json`

**.planning/:**
- Purpose: GSD planning documentation
- Generated: Yes (created by `/gsd:map-codebase` command)
- Committed: Yes (tracked in git for reference)

**logs/:**
- Purpose: Application runtime logs
- Generated: Yes (created at runtime by Winston logger)
- Committed: No (gitignored)

**public/:**
- Purpose: Static assets served directly (no processing)
- Generated: No (manually maintained)
- Committed: Yes (images, icons, static resources)

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (from package-lock.json)
- Committed: No (gitignored)

**.next/:**
- Purpose: Next.js build output
- Generated: Yes (created during `npm run build`)
- Committed: No (gitignored)

---

*Structure analysis: 2026-01-23*
