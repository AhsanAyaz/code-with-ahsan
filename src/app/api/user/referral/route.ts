import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { consumeReferral } from "@/lib/ambassador/referral";
import { REFERRAL_COOKIE_NAME } from "@/lib/ambassador/constants";

/**
 * POST /api/user/referral
 *
 * Consumes the cwa_ref attribution cookie on sign-in.
 * Called client-side by AuthService after every signInWithPopup (GH#267 / VIS-135):
 *   - new users are attributed at signup (their first login);
 *   - existing users who still hold a valid cwa_ref cookie are backfilled on their
 *     next login (the Firebase v12 SDK does not expose additionalUserInfo.isNewUser,
 *     so we do not gate on it — consumeReferral is idempotent, making this safe).
 * Attribution is tied to account creation, not mentorship-profile creation.
 *
 * Never returns a non-2xx for attribution failures — signup must always succeed.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const refCode = request.cookies.get(REFERRAL_COOKIE_NAME)?.value;
  if (!refCode) {
    return NextResponse.json({ attributed: false, reason: "no_cookie" }, { status: 200 });
  }

  const result = await consumeReferral(auth.uid, refCode);

  if (result.ok) {
    console.log(
      `[user/referral] attribution success: ambassador=${result.ambassadorId} user=${auth.uid} code=${refCode} referralId=${result.referralId}`
    );
  } else {
    console.log(
      `[user/referral] attribution skipped: user=${auth.uid} code=${refCode} reason=${result.reason}`
    );
  }

  const response = NextResponse.json(
    result.ok
      ? { attributed: true, referralId: result.referralId }
      : { attributed: false, reason: result.reason },
    { status: 200 }
  );

  // Clear cookie on definitive outcomes (same logic as mentorship/profile route).
  // On transient error ("error" reason), leave the cookie so the next page load retries.
  if (result.ok || result.reason !== "error") {
    response.cookies.delete(REFERRAL_COOKIE_NAME);
  }

  return response;
}
