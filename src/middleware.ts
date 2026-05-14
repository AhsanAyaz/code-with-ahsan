/**
 * Phase 4 (REF-02): Next.js Edge middleware — sets the `cwa_ref` referral cookie.
 *
 * Runs on page navigations (not /api, not /_next static). When `?ref=CODE` is present
 * AND no `cwa_ref` cookie already exists, sets an HttpOnly SameSite=Lax cookie for
 * 30 days. Never overwrites an existing cookie (preserves original attribution per D-03).
 *
 * CRITICAL: HttpOnly is required — client JS MUST NOT be able to read or tamper.
 * Server-side consumption happens in POST /api/mentorship/profile (Task 4).
 */
import { NextRequest, NextResponse } from "next/server";
import {
  REFERRAL_COOKIE_NAME,
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/ambassador/constants";

export function middleware(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  if (!ref || ref.trim().length === 0) {
    return NextResponse.next();
  }

  // Never overwrite existing attribution — preserves first-click within 30-day window.
  const existing = request.cookies.get(REFERRAL_COOKIE_NAME);
  if (existing) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(REFERRAL_COOKIE_NAME, ref.trim(), {
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

/**
 * Matcher excludes:
 *   - Next.js internals (`_next/static`, `_next/image`)
 *   - Favicon
 *   - /api/ routes — the cookie is relevant to page navigations only,
 *     and excluding /api/ prevents double-execution when the profile POST runs.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
