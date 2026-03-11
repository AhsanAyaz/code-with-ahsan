import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { listCourses, createCourse } from '@/lib/course-mdx';
import { db } from '@/lib/firebaseAdmin';

// ─────────────────────────────────────────────
// Auth helper — Firestore session verification
// ─────────────────────────────────────────────

async function checkAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  const token = request.headers.get('x-admin-token');
  if (!token) {
    return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }
  const sessionDoc = await db.collection('admin_sessions').doc(token).get();
  if (!sessionDoc.exists) {
    return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }
  const session = sessionDoc.data();
  const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);
  if (expiresAt < new Date()) {
    await db.collection('admin_sessions').doc(token).delete();
    return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }
  return null;
}

// ─────────────────────────────────────────────
// GET /api/admin/courses — list all courses
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  try {
    const courses = await listCourses();
    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Error listing courses:', error);
    const message = error instanceof Error ? error.message : 'Failed to list courses';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/admin/courses — create a new course
// ─────────────────────────────────────────────

const VALID_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(request: NextRequest) {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  let body: {
    slug?: string;
    name?: string;
    description?: string;
    outline?: string;
    videoId?: string;
    chapters?: Array<{ title: string; timestampSeconds: number }>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { slug, name, description = '', outline = '', videoId = '', chapters = [] } = body;

  // Validate required fields
  if (!slug || !name) {
    return NextResponse.json({ error: 'slug and name are required' }, { status: 400 });
  }

  // Validate slug format: lowercase, hyphens only
  if (!VALID_SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: 'slug must be lowercase letters, numbers, and hyphens only' },
      { status: 400 }
    );
  }

  try {
    const result = await createCourse({ slug, name, description, outline, videoId, chapters });

    // Regenerate courses index
    try {
      execSync('node scripts/content/build-courses-index.js', {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    } catch (indexError) {
      console.error('Failed to regenerate courses index:', indexError);
      // Non-fatal: course files are created, index can be rebuilt manually
    }

    return NextResponse.json({ success: true, slug: result.slug }, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    const message = error instanceof Error ? error.message : 'Failed to create course';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
