# External Integrations

**Analysis Date:** 2026-01-23

## APIs & External Services

**AI/ML:**
- Google Gemini API - Generate AI-powered mentorship announcements
  - SDK/Client: `@google/genai` v1.33.0
  - Auth: `OPEN_AI_SECRET` env var (note: variable name misleading, used for GenAI)
  - Implementation: `src/app/api/logic-buddy/route.ts`, `src/app/api/mentorship/announcement-image/route.tsx`

**Video Platform:**
- YouTube Data API v3 - Fetch video comments
  - Client: `googleapis` v169.0.0
  - Auth: `YT_API_KEY` env var
  - Implementation: `src/services/YouTubeService.js`, `src/app/api/youtube/comments/route.ts`

**Email Marketing:**
- Mailchimp Marketing API - Newsletter subscriptions and email campaigns
  - SDK/Client: `@mailchimp/mailchimp_marketing` v3.0.80
  - Auth: `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_API_SERVER` env vars
  - Implementation: `src/app/api/mailchimp/route.ts`

**Social Media:**
- Facebook Graph API - Page management and comments (integrated indirectly)
  - Auth: `FB_USER_ID`, `FB_PAGE_ACCESS_TOKEN`, `CODE_WITH_AHSAN_PAGE_ID` env vars
  - Usage: Not directly referenced in codebase, likely for analytics/management

**Webhooks & Automation:**
- n8n Workflow Automation - Webhook for book interest signups
  - Endpoint: `https://n8n.codewithahsan.dev/webhook/book-interest-signup`
  - Implementation: `src/app/api/book-interest/route.ts`

**Misc APIs:**
- Quote of the Day API - Quotes feature (via `QOD_EP_API_KEY`)
- Utterances - GitHub-based comments (via `NEXT_PUBLIC_UTTERANCES_REPO`)

## Data Storage

**Databases:**

**Firestore (Primary for Mentorship):**
- Type: NoSQL document database (Google Firebase)
- Connection: Firebase Admin SDK with service account credentials
- Client: `firebase-admin` v13.6.0
- Auth Environment Variables:
  - `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string), OR
  - `FIREBASE_PRIVATE_KEY` + `FIREBASE_CLIENT_EMAIL`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- Usage: Mentorship program data (profiles, matches, ratings, goals, sessions)
- Implementation: `src/lib/firebaseAdmin.ts` initializes admin SDK
- Collections stored:
  - Mentors/Mentees profiles
  - Mentorship matches
  - Goals, sessions, ratings
  - Leaderboard data
- API Routes: Most mentorship endpoints in `src/app/api/mentorship/` use Firestore

**MongoDB (Secondary, Course/Content DB):**
- Type: NoSQL document database
- Connection: Mongoose ODM
- Client: `mongoose` v9.0.1
- Auth: `MONGODB_URI` env var
- Usage: Courses, posts, user progress (legacy or secondary use)
- Implementation: `src/lib/dbConnect.js` - connection pooling with caching
- Note: See CONCERNS.md for potential dual-database complexity

**Firebase Realtime Database:**
- Type: NoSQL real-time database
- Connection: Firebase Admin SDK
- Auth: `FIREBASE_DB_URL` env var
- Usage: Real-time data synchronization (secondary to Firestore)

**File Storage:**
- Firebase Cloud Storage - User-generated content, images
  - Storage Bucket: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` env var
  - Client: `firebase-admin` storage bucket
  - Usage: Profile photos, course submissions, announcement images
  - Implementation: `src/lib/firebaseAdmin.ts` initializes storage bucket

**Caching:**
- None detected - no Redis or memcached configured

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication - Primary auth system
  - Implementation: Client-side in React components, admin in API routes
  - Supported methods: Email/password (inferred), custom tokens
  - Client imports: `firebase/auth` in components
  - Admin imports: `firebase-admin/auth` in API routes
  - Session management: Firebase client SDK tokens

**Additional Security:**
- Password hashing: bcryptjs v3.0.3 for admin authentication
  - Implementation: `src/app/api/mentorship/admin/auth/route.ts`

## Monitoring & Observability

**Error Tracking:**
- Not detected - no Sentry or similar configured

**Logs:**
- Winston v3.19.0 structured logging
  - Console output always enabled
  - File logging in development only (`logs/app.log`, `logs/error.log`)
  - Log level: Controlled by `LOG_LEVEL` env var (defaults to "info")
  - Services: Email service, Discord service, main app logger
  - Implementation: `src/lib/logger.ts`

**Analytics:**
- Google Analytics - Via Firebase Measurement ID
  - Env var: `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- Facebook Events - Via FB_PAGE_ACCESS_TOKEN (inferred)

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from Next.js 16 architecture and env var patterns)
- Deployment: Next.js serverless functions and edge middleware

**CI Pipeline:**
- Not detected in codebase - likely configured in Vercel dashboard

**Build Process:**
- Next.js build: `npm run build`
- Postbuild: Sitemap generation script (`scripts/generate-sitemap.js`)
- Turbopack enabled for dev builds (`next dev --turbo`)

## Environment Configuration

**Required env vars (critical for operation):**
- Firebase credentials: `FIREBASE_SERVICE_ACCOUNT_KEY` OR (`FIREBASE_PRIVATE_KEY` + `FIREBASE_CLIENT_EMAIL`)
- Firebase project: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- Email: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`
- Discord bot: `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID` (for mentorship channels)
- Strapi CMS: `STRAPI_URL`, `STRAPI_API_KEY`
- APIs: `YT_API_KEY`, `OPEN_AI_SECRET`

**Optional env vars (with sensible defaults):**
- `EMAIL_FROM_ADDRESS` - defaults to noreply@codewithahsan.dev
- `EMAIL_FROM_NAME` - defaults to Code with Ahsan Mentorship
- `ADMIN_EMAIL` - defaults to ahsan.ubitian@gmail.com
- `NEXT_PUBLIC_SITE_URL` - defaults to http://localhost:3000
- `LOG_LEVEL` - defaults to info
- `DISABLE_EMAILS` - set to "true" for testing

**Secrets location:**
- Development: `.env` file (git-ignored in production)
- Production: Vercel environment variables dashboard
- Firebase admin: Service account JSON from Google Cloud Console

## Webhooks & Callbacks

**Incoming Webhooks:**
- n8n webhook for book interest signups: `https://n8n.codewithahsan.dev/webhook/book-interest-signup`
  - Implementation: `src/app/api/book-interest/route.ts`
  - Data: User email and book interest information

**Outgoing Webhooks:**
- Discord webhook for notifications
  - Webhook URL: `DISCORD_WEBHOOK` env var
  - Usage: Alerts and announcements (inferred)

## CMS Integration

**Strapi Headless CMS:**
- Purpose: Manage courses, course content, and resources
- Connection: REST API calls via fetch()
- Authentication: API key in `STRAPI_API_KEY` header
- Base URL: `STRAPI_URL` env var (development: http://0.0.0.0:1337)
- Query helpers: `src/lib/strapiQueryHelpers.js` - standardized populate objects
- Implementation:
  - `src/app/courses/[course]/[post]/page.tsx` - Course page data
  - `src/app/courses/[course]/resources/page.tsx` - Course resources
  - `src/app/courses/[course]/submissions/page.tsx` - Student submissions
  - `src/app/api/banners/route.ts` - Banner content
- Data Populated:
  - Courses with nested posts and resources
  - Course metadata and descriptions
  - Published content via publication state filter

## Discord Integration

**Bot Integration for Mentorship:**
- Purpose: Create private channels for mentor-mentee pairs, send notifications
- Bot Token: `DISCORD_BOT_TOKEN` env var
- Guild ID: `DISCORD_GUILD_ID` env var
- API: Discord API v10
- Features:
  - Create mentorship channels with permissions
  - Send channel messages and direct messages
  - Archive completed mentorship channels
  - Unarchive channels for resuming sessions
  - Announcement messages in #find-a-mentor channel
  - Monthly category organization with auto-batching
- Rate Limiting: Built-in retry logic with exponential backoff
- Implementation: `src/lib/discord.ts`
- Channel Naming: Auto-generated from mentor/mentee names
- Permissions: Private by default, visible only to mentor and mentee
- Categories: Auto-organized by month with batch splitting (max 45 channels per category)

---

*Integration audit: 2026-01-23*
