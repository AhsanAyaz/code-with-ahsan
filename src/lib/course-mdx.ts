import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';

const COURSES_ROOT = path.join(process.cwd(), 'src/content/courses');

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CourseListItem {
  slug: string;
  name: string;
  description: string;
  chapters: number;
  posts: number;
  publishedAt: string | null;
}

export interface ChapterTimestamp {
  title: string;
  timestampSeconds: number;
}

export interface CreateCourseInput {
  slug: string;
  name: string;
  description: string;
  outline: string;
  videoId: string;
  chapters: ChapterTimestamp[];
  thumbnail?: string | null;
}

export interface MaxIds {
  maxCourseId: number;
  maxChapterId: number;
  maxPostId: number;
  maxVisibilityOrder: number;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function listDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(dir, d.name));
}

function listMdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.mdx'))
    .map((d) => path.join(dir, d.name))
    .sort();
}

function parseFrontmatter(filePath: string): Record<string, unknown> {
  const source = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(source);
  return parsed.data || {};
}

function writeMdxFile(
  filePath: string,
  frontmatter: Record<string, unknown>,
  body: string = ''
): void {
  const mdx = matter.stringify(body, frontmatter);
  fs.writeFileSync(filePath, mdx, 'utf8');
}

// ─────────────────────────────────────────────
// getMaxIds — scan all courses to find current max IDs
// ─────────────────────────────────────────────

export function getMaxIds(): MaxIds {
  let maxCourseId = 0;
  let maxChapterId = 0;
  let maxPostId = 0;
  let maxVisibilityOrder = 0;

  const courseDirs = listDirs(COURSES_ROOT);

  for (const courseDir of courseDirs) {
    const courseFile = path.join(courseDir, 'course.mdx');
    if (!fs.existsSync(courseFile)) continue;

    const data = parseFrontmatter(courseFile);
    const courseId = Number(data.id) || 0;
    const visibilityOrder = Number(data.visibilityOrder) || 0;

    if (courseId > maxCourseId) maxCourseId = courseId;
    if (visibilityOrder > maxVisibilityOrder) maxVisibilityOrder = visibilityOrder;

    const chapters = Array.isArray(data.chapters) ? data.chapters : [];
    for (const ch of chapters) {
      const chId = Number(ch.id) || 0;
      if (chId > maxChapterId) maxChapterId = chId;
    }

    const postsDir = path.join(courseDir, 'posts');
    const postFiles = listMdxFiles(postsDir);
    for (const postFile of postFiles) {
      const postData = parseFrontmatter(postFile);
      const postId = Number(postData.id) || 0;
      if (postId > maxPostId) maxPostId = postId;
    }
  }

  return { maxCourseId, maxChapterId, maxPostId, maxVisibilityOrder };
}

// ─────────────────────────────────────────────
// listCourses — read all course directories
// ─────────────────────────────────────────────

export async function listCourses(): Promise<CourseListItem[]> {
  const courseDirs = listDirs(COURSES_ROOT);
  const results: CourseListItem[] = [];

  for (const courseDir of courseDirs) {
    const courseFile = path.join(courseDir, 'course.mdx');
    if (!fs.existsSync(courseFile)) continue;

    const data = parseFrontmatter(courseFile);
    const slug = path.basename(courseDir);
    const chapters = Array.isArray(data.chapters) ? data.chapters : [];

    const postsDir = path.join(courseDir, 'posts');
    const postFiles = listMdxFiles(postsDir);

    results.push({
      slug,
      name: String(data.name || slug),
      description: String(data.description || ''),
      chapters: chapters.length,
      posts: postFiles.length,
      publishedAt: data.publishedAt ? String(data.publishedAt) : null,
    });
  }

  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

// ─────────────────────────────────────────────
// createCourse — create course.mdx + post MDX files
// ─────────────────────────────────────────────

export async function createCourse(data: CreateCourseInput): Promise<{ success: boolean; slug: string }> {
  const { slug, name, description, outline, videoId, chapters, thumbnail } = data;

  const courseDir = path.join(COURSES_ROOT, slug);
  if (fs.existsSync(courseDir)) {
    throw new Error(`Course with slug "${slug}" already exists`);
  }

  const postsDir = path.join(courseDir, 'posts');
  ensureDir(postsDir);

  const ids = getMaxIds();
  const newCourseId = ids.maxCourseId + 1;
  const newChapterId = ids.maxChapterId + 1;
  const newVisibilityOrder = ids.maxVisibilityOrder + 1;

  const now = new Date().toISOString();

  // Write course.mdx
  const courseFrontmatter: Record<string, unknown> = {
    id: newCourseId,
    slug,
    name,
    description: description || '',
    outline: outline || '',
    publishedAt: now,
    duration: null,
    introVideoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
    visibilityOrder: newVisibilityOrder,
    isExternal: false,
    externalCourseUrl: null,
    externalStudentsCount: null,
    banner: thumbnail ? { url: thumbnail } : null,
    resources: [],
    authors: [
      {
        name: 'Muhammad Ahsan Ayaz',
        bio: 'Muhammad Ahsan Ayaz is a Google Developers Expert in Angular and a Software Architect at Scania. He loves helping the startup ecosystem and product owners bring their ideas to life using JavaScript, Angular & Web Technologies. He has built several open-source projects that he maintains, speaks at events, writes articles, and makes video tutorials. https://bio.link/muhd_ahsanayaz',
        avatar: null,
      },
    ],
    chapters: [
      {
        id: newChapterId,
        name,
        description: '',
        showName: false,
        order: 0,
      },
    ],
  };

  writeMdxFile(path.join(courseDir, 'course.mdx'), courseFrontmatter, '');

  // Write post MDX files for each chapter timestamp
  const slugger = new GithubSlugger();
  let nextPostId = ids.maxPostId + 1;

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const postSlug = slugger.slug(chapter.title);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}&t=${chapter.timestampSeconds}`;
    const postOrder = i;

    const postFrontmatter: Record<string, unknown> = {
      id: nextPostId,
      slug: postSlug,
      title: chapter.title,
      description: '',
      type: 'video',
      videoUrl,
      order: postOrder,
      hasAssignment: false,
      publishedAt: now,
      resources: [],
      chapterId: newChapterId,
      chapterOrder: 0,
    };

    const orderStr = String(postOrder).padStart(3, '0');
    const fileName = `000-${orderStr}-${postSlug}.mdx`;
    writeMdxFile(path.join(postsDir, fileName), postFrontmatter, '');

    nextPostId++;
  }

  return { success: true, slug };
}

// ─────────────────────────────────────────────
// deleteCourse — remove course directory
// ─────────────────────────────────────────────

export async function deleteCourse(slug: string): Promise<{ success: boolean }> {
  const courseDir = path.join(COURSES_ROOT, slug);

  if (!fs.existsSync(courseDir)) {
    throw new Error(`Course with slug "${slug}" does not exist`);
  }

  // Validate it's actually inside COURSES_ROOT (security check)
  const resolvedCourseDir = fs.realpathSync(courseDir);
  const resolvedRoot = fs.realpathSync(COURSES_ROOT);
  if (!resolvedCourseDir.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Invalid course slug "${slug}"`);
  }

  fs.rmSync(courseDir, { recursive: true, force: true });
  return { success: true };
}
