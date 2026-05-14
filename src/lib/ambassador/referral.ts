/**
 * Phase 4 (REF-03, REF-04): Server-side referral attribution helper.
 *
 * Called from POST /api/mentorship/profile after the first-time profile write.
 * Looks up the ambassador by code, enforces REF-04 guards (self-attribution,
 * double-attribution), and writes a `referrals/{autoId}` doc.
 *
 * Never throws — returns a result object so the caller can log and continue
 * (signup MUST NOT fail because of attribution issues).
 */
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  REFERRAL_CODES_COLLECTION,
  REFERRALS_COLLECTION,
} from "@/lib/ambassador/constants";
import type { ReferralCodeLookup } from "@/types/ambassador";

export type ConsumeReferralResult =
  | { ok: true; referralId: string; ambassadorId: string }
  | {
      ok: false;
      reason: "unknown_code" | "self_attribution" | "already_attributed" | "error";
    };

/**
 * @param referredUserId uid of the newly-signed-up user
 * @param refCode the `cwa_ref` cookie value
 */
export async function consumeReferral(
  referredUserId: string,
  refCode: string,
): Promise<ConsumeReferralResult> {
  try {
    // 1. Resolve code → ambassadorId via top-level lookup (O(1), no index needed)
    const lookupSnap = await db.collection(REFERRAL_CODES_COLLECTION).doc(refCode).get();
    if (!lookupSnap.exists) {
      return { ok: false, reason: "unknown_code" };
    }
    const lookup = lookupSnap.data() as ReferralCodeLookup;
    const ambassadorId = lookup.ambassadorId;

    // 2. REF-04 self-attribution guard
    if (ambassadorId === referredUserId) {
      return { ok: false, reason: "self_attribution" };
    }

    // 3. REF-04 double-attribution guard
    const existing = await db
      .collection(REFERRALS_COLLECTION)
      .where("referredUserId", "==", referredUserId)
      .limit(1)
      .get();
    if (!existing.empty) {
      return { ok: false, reason: "already_attributed" };
    }

    // 4. Write the referral doc
    const writeResult = await db.collection(REFERRALS_COLLECTION).add({
      ambassadorId,
      referredUserId,
      convertedAt: FieldValue.serverTimestamp(),
      sourceCode: refCode,
    });

    return { ok: true, referralId: writeResult.id, ambassadorId };
  } catch (err) {
    console.error(`[consumeReferral] failed for referredUserId=${referredUserId} refCode=${refCode}:`, err);
    return { ok: false, reason: "error" };
  }
}
