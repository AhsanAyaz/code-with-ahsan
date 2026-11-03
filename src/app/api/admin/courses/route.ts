import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { listCourses, createCourse, reorderCourses } from "@/lib/course-mdx";
import { requireAdminAccess, logAdminAction } from "@/lib/adminAccess/server";

// ─────────────────────────────────────────────
// GET /api/admin/courses — list all courses
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const access = await requireAdminAccess(request, "courses.read");
  if (!access.ok) return access.response;

  try {
    const courses = await listCourses();
    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Error listing courses:", error);
    const message = error instanceof Error ? error.message : "Failed to list courses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/admin/courses — create a new course
// ─────────────────────────────────────────────

const VALID_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(request: NextRequest) {
  const access = await requireAdminAccess(request, "courses.create");
  if (!access.ok) return access.response;

  let body: {
    slug?: string;
    name?: string;
    description?: string;
    outline?: string;
    videoId?: string;
    chapters?: Array<{ title: string; timestampSeconds: number }>;
    thumbnail?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    slug,
    name,
    description = "",
    outline = "",
    videoId = "",
    chapters = [],
    thumbnail,
  } = body;

  // Validate required fields
  if (!slug || !name) {
    return NextResponse.json({ error: "slug and name are required" }, { status: 400 });
  }

  // Validate slug format: lowercase, hyphens only
  if (!VALID_SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "slug must be lowercase letters, numbers, and hyphens only" },
      { status: 400 }
    );
  }

  try {
    const result = await createCourse({
      slug,
      name,
      description,
      outline,
      videoId,
      chapters,
      thumbnail,
    });

    // Regenerate courses index
    try {
      execSync("node scripts/content/build-courses-index.js", {
        cwd: process.cwd(),
        stdio: "pipe",
      });
    } catch (indexError) {
      console.error("Failed to regenerate courses index:", indexError);
      // Non-fatal: course files are created, index can be rebuilt manually
    }

    await logAdminAction(access.actor, "courses.create", {
      type: "course",
      id: result.slug,
      label: name,
    });

    return NextResponse.json({ success: true, slug: result.slug }, { status: 201 });
  } catch (error) {
    console.error("Error creating course:", error);
    const message = error instanceof Error ? error.message : "Failed to create course";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/admin/courses — reorder courses
// Body: { orderedSlugs: string[] }
// ─────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const access = await requireAdminAccess(request, "courses.reorder");
  if (!access.ok) return access.response;

  let body: { orderedSlugs?: string[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderedSlugs } = body;
  if (!Array.isArray(orderedSlugs) || orderedSlugs.length === 0) {
    return NextResponse.json({ error: "orderedSlugs array required" }, { status: 400 });
  }

  try {
    await reorderCourses(orderedSlugs);

    // Regenerate courses index
    try {
      execSync("node scripts/content/build-courses-index.js", {
        cwd: process.cwd(),
        stdio: "pipe",
      });
    } catch (indexError) {
      console.error("Failed to regenerate courses index:", indexError);
    }

    await logAdminAction(
      access.actor,
      "courses.reorder",
      { type: "courses", id: "order" },
      { orderedSlugs }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering courses:", error);
    const message = error instanceof Error ? error.message : "Failed to reorder courses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
