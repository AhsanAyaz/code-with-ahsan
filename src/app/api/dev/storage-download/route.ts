/**
 * GET /api/dev/storage-download?path={storagePath}
 *
 * Dev-only proxy for reading files out of the Firebase Storage emulator when
 * admin can't mint a V4 signed URL locally (no service-account key). Calls the
 * emulator's GCS-style download endpoint which bypasses storage.rules, then
 * streams the bytes back to the browser so `<a href>` navigation works without
 * any auth headers.
 *
 * Hard-gated on NODE_ENV === "development" AND FIREBASE_STORAGE_EMULATOR_HOST
 * being set, so this route 404s in prod builds.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  if (!emulatorHost) {
    return NextResponse.json(
      { error: "FIREBASE_STORAGE_EMULATOR_HOST not set" },
      { status: 503 },
    );
  }

  // Align bucket to the active project under singleProjectMode (see storage-upload route).
  const rawBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const bucket =
    projectId && (!rawBucket || !rawBucket.startsWith(projectId))
      ? `${projectId}.appspot.com`
      : rawBucket;
  if (!bucket) {
    return NextResponse.json(
      { error: "Storage bucket is not configured" },
      { status: 503 },
    );
  }

  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path query param" }, { status: 400 });
  }

  // GCS JSON-API download endpoint — bypasses Firebase Storage rules, which
  // require `request.auth.token.admin == true` for read. Browser navigation
  // can't satisfy that, so we proxy through the admin plane instead.
  const emulatorUrl =
    `http://${emulatorHost}/download/storage/v1/b/${encodeURIComponent(bucket)}` +
    `/o/${encodeURIComponent(path)}?alt=media`;

  let res: Response;
  try {
    res = await fetch(emulatorUrl);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Could not reach Storage emulator",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "Emulator download failed", status: res.status, detail },
      { status: res.status === 404 ? 404 : 502 },
    );
  }

  const contentType = res.headers.get("Content-Type") ?? "application/octet-stream";
  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
