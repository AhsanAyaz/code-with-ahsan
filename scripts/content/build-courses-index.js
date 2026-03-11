#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const root = process.cwd();
const coursesRoot = path.join(root, 'src/content/courses');
const outputPath = path.join(root, 'src/content/courses.generated.json');

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(dir, d.name));
}

function listMdxFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.mdx'))
    .map((d) => path.join(dir, d.name))
    .sort();
}

function parseMdxFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(source);
  return {
    data: parsed.data || {},
    content: parsed.content || '',
  };
}

function buildCourse(courseDir) {
  const courseFile = path.join(courseDir, 'course.mdx');
  if (!fs.existsSync(courseFile)) {
    throw new Error(`Missing course file: ${courseFile}`);
  }

  const { data: courseData } = parseMdxFile(courseFile);
  const chapters = Array.isArray(courseData.chapters) ? [...courseData.chapters] : [];

  const chaptersById = new Map();
  chapters.forEach((chapter) => {
    const id = chapter.id;
    if (id === undefined || id === null) return;
    chaptersById.set(id, {
      id,
      name: chapter.name || '',
      description: chapter.description || '',
      showName: chapter.showName !== false,
      order: safeNum(chapter.order, 0),
      posts: [],
    });
  });

  const postsDir = path.join(courseDir, 'posts');
  const postFiles = listMdxFiles(postsDir);

  for (const postFile of postFiles) {
    const { data: postData, content } = parseMdxFile(postFile);
    const chapterId = postData.chapterId;
    if (!chaptersById.has(chapterId)) {
      continue;
    }

    const chapter = chaptersById.get(chapterId);
    chapter.posts.push({
      id: postData.id,
      slug: postData.slug,
      title: postData.title,
      description: postData.description || '',
      type: postData.type || 'video',
      videoUrl: postData.videoUrl || '',
      order: safeNum(postData.order, 0),
      hasAssignment: !!postData.hasAssignment,
      publishedAt: postData.publishedAt || null,
      chapter: {
        id: chapterId,
        name: chapter.name,
      },
      resources: Array.isArray(postData.resources) ? postData.resources : [],
      article: content || '',
    });
  }

  const builtChapters = [...chaptersById.values()]
    .map((chapter) => ({
      ...chapter,
      posts: chapter.posts.sort((a, b) => safeNum(a.order, 0) - safeNum(b.order, 0)),
    }))
    .sort((a, b) => safeNum(a.order, 0) - safeNum(b.order, 0));

  return {
    id: courseData.id,
    slug: courseData.slug,
    name: courseData.name,
    description: courseData.description || '',
    outline: courseData.outline || '',
    publishedAt: courseData.publishedAt || null,
    duration: courseData.duration || null,
    introVideoUrl: courseData.introVideoUrl || '',
    visibilityOrder: safeNum(courseData.visibilityOrder, 0),
    isExternal: !!courseData.isExternal,
    externalCourseUrl: courseData.externalCourseUrl || null,
    externalStudentsCount:
      typeof courseData.externalStudentsCount === 'number'
        ? courseData.externalStudentsCount
        : null,
    isVisible: courseData.isVisible !== false,
    banner: courseData.banner || null,
    resources: Array.isArray(courseData.resources) ? courseData.resources : [],
    authors: Array.isArray(courseData.authors) ? courseData.authors : [],
    chapters: builtChapters,
  };
}

function main() {
  const courseDirs = listDirs(coursesRoot);
  const courses = courseDirs.map(buildCourse);
  courses.sort((a, b) => safeNum(b.visibilityOrder, 0) - safeNum(a.visibilityOrder, 0));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'mdx',
    count: courses.length,
    courses,
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${outputPath} (${courses.length} courses)`);
}

main();
