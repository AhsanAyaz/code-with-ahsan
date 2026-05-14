/**
 * Feature flag helpers.
 *
 * Single source of truth for ambassador program feature flag (per D-12 in 01-CONTEXT.md).
 * Callers MUST use this helper — do not read process.env.FEATURE_AMBASSADOR_PROGRAM
 * or process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM directly anywhere else.
 *
 * Decision (D-09): Flag is a Next.js env var, flipped via Vercel redeploy (~30s).
 * Decision (D-10): When disabled, ambassador routes return 404 via notFound().
 */

/**
 * Returns true if the Student Ambassador Program is enabled in this deployment.
 *
 * Reads:
 *   - Server-side: process.env.FEATURE_AMBASSADOR_PROGRAM
 *   - Client-side: process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM (Next.js inlines at build time)
 *
 * Both must be the string "true" to enable. Any other value (including unset) = disabled.
 *
 * Off by default (per .env.example). Turn on via Vercel env vars at the start of Phase 2.
 */
export function isAmbassadorProgramEnabled(): boolean {
  if (typeof window === "undefined") {
    // Server: read the server env var
    return process.env.FEATURE_AMBASSADOR_PROGRAM === "true";
  }
  // Client: Next.js inlined NEXT_PUBLIC_* at build time
  return process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM === "true";
}
