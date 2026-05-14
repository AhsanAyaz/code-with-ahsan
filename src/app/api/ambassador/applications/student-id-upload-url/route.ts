/**
 * POST /api/ambassador/applications/student-id-upload-url
 *
 * Returns a short-lived (10-minute) Firebase Storage signed upload URL for
 * the student-ID photo (APPLY-05, D-14). The browser uploads the file directly
 * to Storage — no file bytes pass through this route.
 *
 * Storage path: applications/{applicantUid}/{applicationId}/student_id.{ext}  (D-14)
 *
 * Pitfall 3: isAmbassadorProgramEnabled() is the FIRST check.
 * Pitfall 7: storage may be null in local dev (bucket env missing). Fail loudly, not silently.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { isAmbassadorProgramEnabled } from "@/lib/features";

// Allowed content types for the student ID photo.
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const UPLOAD_URL_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes — matches storage.rules max (Plan 03)
const MAX_SIZE_BYTES = 10 * 1024 * 1024;      // 10 MB — mirrors storage.rules from Plan 03

const BodySchema = z.object({
  applicationId: z.string().min(1),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  fileSizeBytes: z.number().int().positive().max(MAX_SIZE_BYTES),
});

function extFromContentType(ct: (typeof ALLOWED_CONTENT_TYPES)[number]): string {
  if (ct === "image/jpeg") return "jpg";
  if (ct === "image/png") return "png";
  return "webp";
}

export async function POST(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Pitfall 7: storage may be null in local dev when NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is unset.
  if (!storage) {
    return NextResponse.json(
      { error: "Storage is not configured in this environment. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { applicationId, contentType } = parsed.data;

  // Path: applications/{applicantUid}/{applicationId}/student_id.{ext}  (D-14)
  const ext = extFromContentType(contentType);
  const storagePath = `applications/${auth.uid}/${applicationId}/student_id.${ext}`;

  const expiresAtMs = Date.now() + UPLOAD_URL_EXPIRY_MS;

  // Dev-emulator bypass: admin is initialized without a service-account
  // private key when pointed at the Storage emulator, so `getSignedUrl`
  // throws "Cannot sign data without client_email". Return a local proxy
  // URL that the client PUTs to; the proxy forwards bytes to the Storage
  // emulator's GCS-style upload endpoint so the file actually lands in
  // the bucket and is visible in the emulator UI.
  if (
    process.env.NODE_ENV === "development" &&
    !!process.env.FIREBASE_STORAGE_EMULATOR_HOST
  ) {
    return NextResponse.json({
      uploadUrl: `/api/dev/storage-upload?path=${encodeURIComponent(storagePath)}`,
      storagePath,
      expiresAtMs,
    });
  }

  const [url] = await storage.file(storagePath).getSignedUrl({
    version: "v4",
    action: "write",
    expires: expiresAtMs,
    contentType,
  });

  return NextResponse.json({ uploadUrl: url, storagePath, expiresAtMs });
}
