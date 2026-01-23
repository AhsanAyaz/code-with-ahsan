# Technology Stack

**Analysis Date:** 2026-01-23

## Languages

**Primary:**
- TypeScript 5.x - Main codebase for API routes and components
- JavaScript - Utility functions and legacy services (`src/lib/`, `src/services/`)
- JSX/TSX - React components

**Secondary:**
- Markdown - Content and blog posts

## Runtime

**Environment:**
- Node.js 20.x (inferred from @types/node)
- Next.js 16.0.10 runtime

**Package Manager:**
- npm (Node Package Manager)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.0.10 - Full-stack React framework with API routes, SSR, and built-in optimization

**Frontend:**
- React 19.2.1 - UI library
- React DOM 19.2.1 - DOM rendering
- Tailwind CSS 4 - Utility-first CSS framework
- DaisyUI 5.5.1-beta.2 - Tailwind component library
- Lucide React 0.562.0 - Icon library

**Content & Documentation:**
- MDX Bundler 10.1.1 - Bundle and run MDX content
- Next MDX Remote 5.0.0 - Serialize/deserialize MDX
- React Markdown 10.1.0 - Markdown-to-React parser
- Remark plugins:
  - remark-gfm 4.0.1 - GitHub Flavored Markdown support
  - remark-math 6.0.0 - Math formula support
  - remark-footnotes 4.0.1 - Footnote syntax
- Rehype plugins:
  - rehype-slug 6.0.0 - Add IDs to headings
  - rehype-autolink-headings 7.1.0 - Auto-link headers
  - rehype-prism-plus 2.0.1 - Code syntax highlighting
  - rehype-katex 7.0.1 - LaTeX math rendering

**Utilities:**
- date-fns 4.1.0 - Date manipulation and formatting
- reading-time 1.5.0 - Estimate reading time for articles
- gray-matter 4.0.3 - YAML frontmatter parsing
- image-size 2.0.2 - Get image dimensions
- qs 6.14.0 - Query string parser/stringifier

**UI & Interaction:**
- body-scroll-lock 4.0.0-beta.0 - Prevent scroll on modal open
- canvas-confetti 1.9.4 - Confetti animation effects
- react-cookie-consent 9.0.0 - Cookie consent banner
- react-lite-youtube-embed 3.3.3 - Lightweight YouTube embed
- next-themes 0.4.6 - Dark/light mode theme management

**Icons & Graphics:**
- @fortawesome/fontawesome-svg-core 7.1.0 - Font Awesome core
- @fortawesome/free-solid-svg-icons 7.1.0 - Solid icons
- @fortawesome/react-fontawesome 3.1.1 - React Font Awesome wrapper
- @svgr/webpack 8.1.0 - Import SVGs as React components

## Key Dependencies

**Critical:**
- Firebase 12.6.0 - Client-side Firebase (auth, real-time DB, storage)
- Firebase Admin 13.6.0 - Server-side Firebase admin SDK (Firestore, Storage, Auth)
- Mongoose 9.0.1 - MongoDB ODM (object-document mapper)
- @google/genai 1.33.0 - Google GenAI SDK (Gemini API for AI features)

**Email & Messaging:**
- mailgun.js 12.6.1 - Mailgun email delivery
- @mailchimp/mailchimp_marketing 3.0.80 - Mailchimp email marketing
- nodemailer (indirect through Mailgun/Mailchimp) - Email transport

**Authentication & Security:**
- bcryptjs 3.0.3 - Password hashing

**CMS & Content:**
- Strapi (external) - Headless CMS for courses and content (connected via REST API)

**Analytics & External Services:**
- googleapis 169.0.0 - Google APIs client (YouTube comments, Google Drive, etc.)
- axios 1.13.2 - HTTP client for API requests

**Utilities:**
- md5 2.3.0 - MD5 hashing (likely for gravatar or similar)
- github-slugger 2.0.0 - Generate URL-safe slugs from headings
- unist-util-visit 5.0.0 - Tree traversal utility for AST processing
- form-data 4.0.5 - FormData polyfill for Node.js

**Logging:**
- winston 3.19.0 - Structured logging system

## Configuration

**Environment:**

### Required Environment Variables

**Firebase (Client):**
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSENGER_ID` - Firebase messenger ID (unused)
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` - Firebase measurement ID
- `FIREBASE_DB_URL` - Firebase Realtime Database URL

**Firebase (Admin):**
- `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string) OR `FIREBASE_PRIVATE_KEY` + `FIREBASE_CLIENT_EMAIL`

**Email (Mailgun):**
- `MAILGUN_API_KEY` - Mailgun API key
- `MAILGUN_DOMAIN` - Mailgun domain
- `EMAIL_FROM_ADDRESS` - Sender email (optional, defaults to noreply@codewithahsan.dev)
- `EMAIL_FROM_NAME` - Sender display name (optional)
- `ADMIN_EMAIL` - Admin email for alerts

**Email (Mailchimp):**
- `MAILCHIMP_API_KEY` - Mailchimp API key
- `MAILCHIMP_AUDIENCE_ID` - Mailchimp audience/list ID
- `MAILCHIMP_API_SERVER` - Mailchimp server (e.g., us1)

**CMS & Content:**
- `STRAPI_URL` - Strapi server URL
- `STRAPI_API_KEY` - Strapi API key
- `NEXT_PUBLIC_STRAPI_URL` - Public Strapi URL (optional, for client-side requests)

**AI & APIs:**
- `OPEN_AI_SECRET` - OpenAI API key (for logic buddy feature, or may be replaced by GenAI)

**Analytics & Social:**
- `YT_API_KEY` - YouTube API key (for video comments)
- `FB_USER_ID` - Facebook user ID
- `FB_PAGE_ACCESS_TOKEN` - Facebook page access token
- `CODE_WITH_AHSAN_PAGE_ID` - Facebook page ID
- `QOD_EP_API_KEY` - Quote of the Day API key
- `NEXT_PUBLIC_UTTERANCES_REPO` - Utterances repo for comments

**Discord Integration:**
- `DISCORD_WEBHOOK` - Discord webhook for notifications
- `DISCORD_BOT_TOKEN` - Discord bot token (for mentorship channels)
- `DISCORD_GUILD_ID` - Discord guild/server ID
- `DISCORD_MENTORSHIP_CATEGORY_ID` - (Optional) Category ID for mentorship channels (now auto-created)

**Application:**
- `NEXT_PUBLIC_SITE_URL` - Public site URL (defaults to http://localhost:3000)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Winston log level (debug/info/warn/error, defaults to info)
- `DISABLE_EMAILS` - Set to "true" to disable email sending

### Configuration Files

**Build & Framework:**
- `next.config.ts` - Next.js configuration with image domains, rewrites, redirects, and SVG webpack config
- `tsconfig.json` - TypeScript compiler options with path aliases (@/*, contexts/*, services/*, components/*, data/*)
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.mjs` - PostCSS configuration for Tailwind
- `eslint.config.mjs` - ESLint rules (ESLint 9.x)
- `.env` - Local development environment variables

**Root Files:**
- `package.json` - Project metadata, scripts, dependencies
- `package-lock.json` - Locked dependency versions (622 KB)

## Platform Requirements

**Development:**
- Node.js 20.x
- npm 10.x
- Terminal/CLI for running dev server and build scripts
- TypeScript knowledge for type checking

**Production:**
- Node.js 20.x runtime
- Vercel deployment (inferred from Next.js 16 setup, env vars like FIREBASE_SERVICE_ACCOUNT_KEY usage)
- Firebase project (Cloud Firestore, Storage, Authentication, Realtime DB)
- MongoDB database
- Mailgun account (for transactional emails)
- Discord bot in guild (for mentorship channels)
- Strapi CMS instance (development/staging or production)

**External Services Required:**
- Firebase/Google Cloud
- MongoDB Atlas or self-hosted MongoDB
- Mailgun
- Mailchimp
- Discord server with bot
- Strapi instance
- YouTube API access
- Facebook API access
- Google Gemini API (for GenAI features)

---

*Stack analysis: 2026-01-23*
