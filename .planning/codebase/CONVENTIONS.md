# Coding Conventions

**Analysis Date:** 2026-01-23

## Naming Patterns

**Files:**
- TypeScript/React files: PascalCase for components (e.g., `Button.tsx`, `MentorProfileClient.tsx`)
- Utility/service files: camelCase (e.g., `discord.ts`, `logger.ts`, `formatDate.js`)
- API route files: lowercase with hyphens (e.g., `route.ts`, `route.tsx`)
- Constants/templates: camelCase with descriptive names (e.g., `mentorship-templates.ts`)

**Functions:**
- Regular functions: camelCase (e.g., `getHeaders()`, `sleep()`, `fetchWithRateLimit()`)
- React components: PascalCase (e.g., `Button`, `Card`, `CustomLink`)
- Event handlers: camelCase with `handle` prefix (e.g., `handleDismiss()`, `toggleSkill()`)
- Async functions: camelCase (e.g., `logIn()`, `getCurrentUser()`)

**Variables:**
- Constants: camelCase (e.g., `SKILLS_OPTIONS`, `LOG_LEVEL`, `MAILGUN_API_KEY`)
- Local variables: camelCase (e.g., `baseUsername`, `usernameExists`, `emailStyles`)
- State hooks: camelCase with `set` prefix for updaters (e.g., `setDiscordUsername`, `setSkillsSought`)

**Types:**
- Interface names: PascalCase with `Props` suffix for component props (e.g., `ButtonProps`, `CardProps`, `MenteeRegistrationFormProps`)
- Interface names for API responses: descriptive PascalCase (e.g., `ChannelResult`, `DiscordMember`, `MentorshipProfile`)
- Union types: camelCase or descriptive literals (e.g., `"mentor" | "mentee"`, `"self-study" | "guided" | "mixed"`)

## Code Style

**Formatting:**
- Tool used: Prettier 3.7.4
- No explicit `.prettierrc` file present (uses defaults)
- Double quotes for strings in TypeScript/JSX
- Single quotes for imports in JavaScript files (mixed convention)
- Semicolons: generally included (Next.js default)

**Linting:**
- Tool: ESLint 9 with flat config (`eslint.config.mjs`)
- Configuration includes `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Global ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- ESLint directives used for specific disables (e.g., `/* eslint-disable jsx-a11y/anchor-has-content */`)

**Indentation:**
- 2 spaces (TypeScript/React files)
- Consistent across components and services

## Import Organization

**Order:**
1. External/third-party imports (react, next, libraries)
2. Internal service imports (e.g., `@/lib/firebaseAdmin`)
3. Component imports (e.g., `@/components/...`)
4. Type/interface imports
5. Local file exports

**Path Aliases:**
- `@/*` → `./src/*` (main alias)
- `contexts/*` → `./src/contexts/*`
- `services/*` → `./src/services/*`
- `components/*` → `./src/components/*`
- `data/*` → `./src/data/*`

**Examples:**
```typescript
// Discord service imports
import { createLogger } from "./logger";
const log = createLogger("discord");

// API route imports
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { sendAdminMentorPendingEmail } from "@/lib/email";

// Component imports
import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import Link from "./Link";
import Image from "./Image";
```

## Error Handling

**Patterns:**
- Try-catch blocks used in API routes and async functions
- Error logging to console (also to Winston logger when available)
- Return error responses in Next.js API routes with appropriate HTTP status codes
- Example: `console.error("Error fetching mentorship profile:", error);`
- Graceful fallback for auth errors in non-critical endpoints (return empty array instead of crash)
- Type coercion for errors: `catch (error: any)` with comment when needed

**Error Response Format:**
```typescript
// Validation errors (400)
return NextResponse.json(
  { error: "Missing uid parameter" },
  { status: 400 }
);

// Server errors (500)
return NextResponse.json(
  { error: "Failed to fetch profile" },
  { status: 500 }
);
```

## Logging

**Framework:** Winston (configured in `src/lib/logger.ts`)

**Patterns:**
- Create service-specific loggers: `const log = createLogger("discord")`
- Log levels: `info` (default), `error`, `debug` (controlled by `LOG_LEVEL` env var)
- Console output always enabled with colored formatting
- File output in development only (separate `app.log` and `error.log`)
- Log format includes timestamp and service name
- Structured logging with metadata: `log.debug('message', { key: value })`

**Usage:**
```typescript
import { createLogger } from "@/lib/logger";
const log = createLogger("serviceName");
log.info("Message here");
log.error("Error occurred", { error: err });
log.debug("Debug info"); // Only shown when LOG_LEVEL=debug
```

## Comments

**When to Comment:**
- JSDoc-style comments for exported functions and classes
- Inline comments for complex logic or non-obvious decisions
- Comments for environment-dependent behavior (e.g., "Only add file transports in development")
- Comments explaining why something is done, not what (code is self-explanatory)

**JSDoc/TSDoc:**
- Used extensively for service functions (e.g., Discord functions, email templates)
- Multi-line format with asterisks:
```typescript
/**
 * Discord Bot Service for Mentorship Integration
 *
 * This module provides functions to interact with Discord for the mentorship program:
 * - Creating private channels for mentor-mentee sessions
 * - Sending DM notifications
 * - Managing channel permissions
 *
 * Requires environment variables:
 * - DISCORD_BOT_TOKEN: Bot token from Discord Developer Portal
 * - DISCORD_GUILD_ID: Your Discord server ID
 */
```

- Function-level JSDoc:
```typescript
/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

## Function Design

**Size:** No strict limit observed, but range from 10-50 lines for utilities
- Larger files (500+ lines) exist for complex features (e.g., admin pages, client components)
- Functions extracted to separate utilities when used across multiple files

**Parameters:**
- Named parameters preferred in React components (destructured props)
- Function signatures include explicit types
- Optional parameters marked with `?`
- Complex parameter objects documented

**Return Values:**
- Explicit return types on function signatures (TypeScript)
- Async functions return `Promise<T>`
- API routes return `NextResponse` objects
- Service functions return typed objects or null

## Module Design

**Exports:**
- Default exports for React components: `export default Button;`
- Named exports for utility functions and types: `export function createLogger(service: string)`
- Mixed exports in library files (e.g., logger exports both named and default)

**Barrel Files:**
- Not extensively used; imports are specific to files
- Example: `import Button from "@/components/Button.tsx"`

**File Organization by Layer:**
- `src/components/` - React UI components
- `src/lib/` - Utilities, services, and helpers (discord, email, logger, mdx, etc.)
- `src/services/` - Legacy service classes (AuthService.js, CourseService.js)
- `src/app/api/` - API route handlers (Next.js app router)
- `src/data/` - Static data and metadata
- `src/contexts/` - React context providers (e.g., ToastContext)

## Type Safety

**TypeScript Usage:**
- Strict mode enabled (`"strict": true` in tsconfig.json)
- Interfaces used for component props and API payloads
- Type aliases for union types and complex types
- Generic types in API responses (handling Firestore timestamps, etc.)

**Type Examples:**
```typescript
interface ButtonProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
  color?: "primary" | "accent" | "hackstack" | string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

interface ChannelResult {
  channelId: string;
  channelUrl: string;
}

type CustomLinkProps = LinkProps &
  DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> & { href: string }
```

---

*Convention analysis: 2026-01-23*
