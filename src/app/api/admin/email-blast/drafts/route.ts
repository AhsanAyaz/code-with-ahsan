import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { listEmailBlastDrafts } from "@/lib/ghost/admin";

/**
 * GET /api/admin/email-blast/drafts
 *
 * Returns Ghost draft posts tagged #email-blast for the blast UI picker.
 * Admin-token gated. Degrades gracefully on Ghost unavailability (returns
 * empty list with error message rather than 5xx) so the UI can still render.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const drafts = await listEmailBlastDrafts();
    return NextResponse.json(
      { drafts },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    console.error("[email-blast/drafts] GET error:", err);
    // Degrade gracefully — UI shows empty picker with a message
    return NextResponse.json(
      { drafts: [], error: "Ghost API unavailable" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
