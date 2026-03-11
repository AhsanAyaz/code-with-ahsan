import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { deleteCourse } from '@/lib/course-mdx';

// ─────────────────────────────────────────────
// Auth helper
// ─────────────────────────────────────────────

function checkAdminAuth(request: NextRequest): NextResponse | null {
  const token = request.headers.get('x-admin-token');
  if (token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  const authError = checkAdminAuth(request);
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
