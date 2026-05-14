/**
 * PUT /api/dev/storage-upload?path={storagePath}
 *
 * Dev-only proxy that forwards the browser's file PUT to the Firebase Storage
 * emulator's GCS-style upload endpoint. Used when admin can't mint a V4 signed
 * URL locally (no service-account key in emulator init). Result: the file
 * actually lands in the emulator bucket and shows up in the emulator UI, so
 * later admin "view student ID" flows have something to display.
 *
 * Hard-gated on NODE_ENV !== "development" AND FIREBASE_STORAGE_EMULATOR_HOST
 * being set, so this route 404s in prod builds.
 */

import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
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

  // Dev/emulator bucket alignment: firebase.json has singleProjectMode: true,
  // so the Storage emulator only serves buckets tied to the active project
  // (NEXT_PUBLIC_FIREBASE_PROJECT_ID, e.g. "demo-codewithahsan"). If the env
  // still points NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET at a production bucket
  // (e.g. "code-with-ahsan-45496.appspot.com"), the emulator won't surface the
  // upload in its UI. Rewrite to `{projectId}.appspot.com` in dev.
  const rawBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const bucket =
    projectId && (!rawBucket || !rawBucket.startsWith(projectId))
      ? `${projectId}.appspot.com`
      : rawBucket;
  if (!bucket) {
    return NextResponse.json(
      { error: "Storage bucket is not configured (NEXT_PUBLIC_FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)" },
      { status: 503 },
    );
  }

  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path query param" }, { status: 400 });
  }

  const contentType =
    request.headers.get("Content-Type") ?? "application/octet-stream";
  const body = await request.arrayBuffer();

  const emulatorUrl =
    `http://${emulatorHost}/upload/storage/v1/b/${encodeURIComponent(bucket)}` +
    `/o?uploadType=media&name=${encodeURIComponent(path)}`;

  let res: Response;
  try {
    res = await fetch(emulatorUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
    });
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
      { error: "Emulator upload failed", status: res.status, detail },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, dev: true, storagePath: path });
}
