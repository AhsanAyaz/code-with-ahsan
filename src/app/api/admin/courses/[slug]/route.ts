import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { deleteCourse } from '@/lib/course-mdx';
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
// DELETE /api/admin/courses/[slug] — remove a course
// ─────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  try {
    await deleteCourse(slug);

    // Regenerate courses index
    try {
      execSync('node scripts/content/build-courses-index.js', {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    } catch (indexError) {
      console.error('Failed to regenerate courses index:', indexError);
      // Non-fatal: course directory is removed, index can be rebuilt manually
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete course';
    const status = message.includes('does not exist') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
