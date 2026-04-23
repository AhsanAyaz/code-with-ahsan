/**
 * Phase 4 (REF-01): Referral code generator for accepted ambassadors.
 *
 * Format: `{PREFIX}-{4HEX}` where PREFIX = first 5 alphanumeric chars of the
 * ambassador's username, uppercased. Non-alphanumerics are replaced with "X".
 *
 * Uniqueness: checked via `referral_codes/{code}` top-level lookup doc
 * (RESEARCH Pitfall 3 — avoids a collection-group index). The lookup doc is
 * written inside `runAcceptanceTransaction` (Plan 02) alongside the subdoc.
 */
import { db } from "@/lib/firebaseAdmin";
import { REFERRAL_CODES_COLLECTION } from "@/lib/ambassador/constants";

const MAX_PREFIX_LEN = 5;
const HEX_LEN = 4;
const MAX_RETRIES = 5;

/** Public for unit tests. Do NOT call directly from app code — always go through generateUniqueReferralCode. */
export function buildCode(username: string): string {
  // Strip non-alphanumeric, then take first 5 chars uppercased.
  // If username is empty (shouldn't happen for accepted ambassadors, but defensive), fall back to "X".
  const safe = (username ?? "").replace(/[^a-zA-Z0-9]/g, "X").toUpperCase();
  const prefix = safe.length > 0 ? safe.slice(0, MAX_PREFIX_LEN) : "X";
  const hexNum = Math.floor(Math.random() * 0xffff);
  const hex = hexNum.toString(16).toUpperCase().padStart(HEX_LEN, "0");
  return `${prefix}-${hex}`;
}

/**
 * Generate a unique referral code with up to 5 collision retries.
 * Reads `referral_codes/{code}` — O(1), no Firestore index required.
 * The caller (acceptance transaction) is responsible for writing the lookup doc.
 *
 * @throws Error if no unique code can be generated after MAX_RETRIES attempts.
 */
export async function generateUniqueReferralCode(username: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const candidate = buildCode(username);
    const snap = await db.collection(REFERRAL_CODES_COLLECTION).doc(candidate).get();
    if (!snap.exists) return candidate;
  }
  throw new Error(
    `Could not generate unique referral code for username="${username}" after ${MAX_RETRIES} attempts`,
  );
}
