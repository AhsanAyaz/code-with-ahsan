#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const root = process.cwd();
const coursesJsonPath = path.join(root, 'src/content/_imports/courses.strapi.json');
const outputRoot = path.join(root, 'src/content/courses');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function writeMdxFile(filePath, frontmatter, body) {
  const mdx = matter.stringify(body || '', frontmatter);
  fs.writeFileSync(filePath, mdx, 'utf8');
}

function main() {
  if (!fs.existsSync(coursesJsonPath)) {
    console.error('Missing src/content/_imports/courses.strapi.json. Run exporter first.');
    process.exit(1);
  }

  const coursesRaw = JSON.parse(fs.readFileSync(coursesJsonPath, 'utf8'));
  const courses = coursesRaw.courses || [];

  if (fs.existsSync(outputRoot)) {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
  ensureDir(outputRoot);

  for (const course of courses) {
    const courseDir = path.join(outputRoot, course.slug);
    const postsDir = path.join(courseDir, 'posts');
    ensureDir(postsDir);

    const chapterMeta = (course.chapters || []).map((ch) => ({
      id: ch.id,
      name: ch.name,
      description: ch.description || '',
      showName: ch.showName !== false,
      order: safeNum(ch.order, 0),
    }));

    const courseFrontmatter = {
      id: course.id,
      slug: course.slug,
      name: course.name,
      description: course.description || '',
      outline: course.outline || '',
      publishedAt: course.publishedAt || null,
      duration: course.duration || null,
      introVideoUrl: course.introVideoUrl || '',
      visibilityOrder: safeNum(course.visibilityOrder, 0),
      isExternal: !!course.isExternal,
      externalCourseUrl: course.externalCourseUrl || null,
      externalStudentsCount:
        typeof course.externalStudentsCount === 'number'
          ? course.externalStudentsCount
          : null,
      banner: course.banner || null,
      resources: Array.isArray(course.resources) ? course.resources : [],
      authors: Array.isArray(course.authors) ? course.authors : [],
      chapters: chapterMeta,
    };

    writeMdxFile(path.join(courseDir, 'course.mdx'), courseFrontmatter, '');

    for (const chapter of course.chapters || []) {
      const chapterOrder = safeNum(chapter.order, 0);
      for (const post of chapter.posts || []) {
        const postOrder = safeNum(post.order, 0);
        const postFrontmatter = {
          id: post.id,
          slug: post.slug,
          title: post.title,
          description: post.description || '',
          type: post.type || 'video',
          videoUrl: post.videoUrl || '',
          order: postOrder,
          hasAssignment: !!post.hasAssignment,
          publishedAt: post.publishedAt || null,
          resources: Array.isArray(post.resources) ? post.resources : [],
          chapterId: chapter.id,
          chapterOrder,
        };

        const baseName = `${String(chapterOrder).padStart(3, '0')}-${String(postOrder).padStart(3, '0')}-${sanitizeFileName(post.slug || post.title || String(post.id))}.mdx`;
        writeMdxFile(path.join(postsDir, baseName), postFrontmatter, post.article || '');
      }
    }
  }

  console.log(`Generated MDX content for ${courses.length} courses at src/content/courses`);
}

main();
