import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { deleteCourse, updateCourse } from "@/lib/course-mdx";
import { requireAdminAccess, logAdminAction } from "@/lib/adminAccess/server";

// ─────────────────────────────────────────────
// DELETE /api/admin/courses/[slug] — remove a course
// ─────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const access = await requireAdminAccess(request, "courses.delete");
  if (!access.ok) return access.response;

  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  try {
    await deleteCourse(slug);

    // Regenerate courses index
    try {
      execSync("node scripts/content/build-courses-index.js", {
        cwd: process.cwd(),
        stdio: "pipe",
      });
    } catch (indexError) {
      console.error("Failed to regenerate courses index:", indexError);
      // Non-fatal: course directory is removed, index can be rebuilt manually
    }

    await logAdminAction(access.actor, "courses.delete", { type: "course", id: slug });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    const message = error instanceof Error ? error.message : "Failed to delete course";
    const status = message.includes("does not exist") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/admin/courses/[slug] — update course fields (e.g. toggle visibility)
// Body: { isVisible?: boolean }
// ─────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const access = await requireAdminAccess(request, "courses.update");
  if (!access.ok) return access.response;

  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Only allow specific fields to be updated
  const allowed: Record<string, unknown> = {};
  if (typeof body.isVisible === "boolean") allowed.isVisible = body.isVisible;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    await updateCourse(slug, allowed);

    // Regenerate courses index
    try {
      execSync("node scripts/content/build-courses-index.js", {
        cwd: process.cwd(),
        stdio: "pipe",
      });
    } catch (indexError) {
      console.error("Failed to regenerate courses index:", indexError);
    }

    await logAdminAction(access.actor, "courses.update", { type: "course", id: slug }, allowed);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating course:", error);
    const message = error instanceof Error ? error.message : "Failed to update course";
    const status = message.includes("does not exist") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
