#!/usr/bin/env node

// SEO content audit for courses + posts.
//
// Reads:
//   - src/content/courses.generated.json (truth for structure + frontmatter)
//   - src/content/courses/<slug>/posts/*.mdx (truth for body word count)
//
// Writes:
//   - .seo-audit/audit-<YYYY-MM-DD>.json (full machine-readable report)
//   - stdout: human-readable summary
//
// Exit codes:
//   0 = no FAIL findings
//   1 = at least one FAIL finding
//   Use --warn-as-fail to also fail on WARN.
//
// Usage:
//   node scripts/content/audit-seo.js
//   node scripts/content/audit-seo.js --json   # only emit json path
//   node scripts/content/audit-seo.js --top 20 # show bottom-N weakest posts

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const ROOT = process.cwd();
const COURSES_INDEX = path.join(ROOT, "src/content/courses.generated.json");
const COURSES_DIR = path.join(ROOT, "src/content/courses");
const OUT_DIR = path.join(ROOT, ".seo-audit");

// ---- Rubric ---------------------------------------------------------------
// Each check returns { status: "pass" | "warn" | "fail", value, note? }.
// Score: pass=2, warn=1, fail=0. Post max=10, course max=8.

const POST_DESC_PASS = 120;
const POST_DESC_WARN = 60;
const POST_TITLE_MIN = 25;
const POST_TITLE_MAX = 70;
const POST_BODY_PASS = 150;
const POST_BODY_WARN = 50;

const COURSE_DESC_PASS = 200;
const COURSE_DESC_WARN = 100;

function scoreOf(status) {
  return { pass: 2, warn: 1, fail: 0 }[status];
}

function checkLength(value, passAt, warnAt, label) {
  const len = (value || "").trim().length;
  if (len >= passAt) return { status: "pass", value: len };
  if (len >= warnAt)
    return { status: "warn", value: len, note: `${label} short (<${passAt})` };
  return {
    status: "fail",
    value: len,
    note: `${label} missing or too short (<${warnAt})`,
  };
}

function checkTitle(title, courseName) {
  // Effective SERP title is "<post title> - <course name>" (set in page metadata).
  // Score on the effective string so short post titles like "Introduction" don't
  // false-fail when the course suffix already brings the SERP title above 30 chars.
  const effective = courseName
    ? `${(title || "").trim()} - ${(courseName || "").trim()}`
    : (title || "").trim();
  const len = effective.length;
  if (len >= POST_TITLE_MIN && len <= POST_TITLE_MAX)
    return { status: "pass", value: len };
  if (len >= 15 && len <= 80)
    return {
      status: "warn",
      value: len,
      note: `effective SERP title length ${len} outside ideal ${POST_TITLE_MIN}-${POST_TITLE_MAX}`,
    };
  return {
    status: "fail",
    value: len,
    note: `effective SERP title length ${len} bad`,
  };
}

function checkMedia(post) {
  if (post.thumbnail) return { status: "pass", value: "thumbnail" };
  if (post.videoUrl)
    return {
      status: "warn",
      value: "video-only",
      note: "no thumbnail; YouTube poster used (no og:image)",
    };
  return { status: "fail", value: "none", note: "no thumbnail and no video" };
}

function checkPublished(post) {
  return post.publishedAt
    ? { status: "pass", value: post.publishedAt }
    : { status: "fail", value: null, note: "missing publishedAt" };
}

// ---- Body word count ------------------------------------------------------

function postMdxPath(courseSlug) {
  return path.join(COURSES_DIR, courseSlug, "posts");
}

function wordCount(text) {
  if (!text) return 0;
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_~\-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function readPostBody(courseSlug, postSlug) {
  const dir = postMdxPath(courseSlug);
  if (!fs.existsSync(dir)) return "";
  const files = fs.readdirSync(dir);
  const match = files.find((f) => f.endsWith(`${postSlug}.mdx`));
  if (!match) return "";
  const { content } = matter(fs.readFileSync(path.join(dir, match), "utf8"));
  return content;
}

function checkBody(courseSlug, post) {
  const body = readPostBody(courseSlug, post.slug);
  const words = wordCount(body);
  // Video posts: body is expected to be empty (lesson is in the YouTube embed).
  // SEO lever for video lessons is description + VideoObject schema, not body word count.
  // We still WARN at 0 words to encourage adding a transcript or summary, but don't FAIL.
  if (post.type === "video") {
    if (words >= POST_BODY_WARN) return { status: "pass", value: words };
    return {
      status: "warn",
      value: words,
      note: `video post w/o transcript or summary (${words} words) — VideoObject schema + description carries SEO`,
    };
  }
  if (words >= POST_BODY_PASS) return { status: "pass", value: words };
  if (words >= POST_BODY_WARN)
    return {
      status: "warn",
      value: words,
      note: `thin body (${words} words)`,
    };
  return {
    status: "fail",
    value: words,
    note: `empty/near-empty body (${words} words)`,
  };
}

function checkSchema(post) {
  // Page emits Article + VideoObject JSON-LD on video posts (see
  // src/lib/seo/videoSchema.ts). Article-only posts get Article JSON-LD.
  // VideoObject requires non-empty description + a recoverable YouTube ID;
  // both conditions are validated in buildVideoObjectLd() at render time, so
  // here we predict the same outcome to keep the audit honest.
  if (post.type !== "video") return { status: "pass", value: "Article" };

  const desc = (post.description || "").trim();
  const url = (post.videoUrl || "").trim();
  if (!desc) {
    return {
      status: "warn",
      value: "Article-only",
      note: "video post: VideoObject suppressed — empty description blocks emit",
    };
  }
  if (!url || !/youtu\.be|youtube\.com/.test(url)) {
    return {
      status: "warn",
      value: "Article-only",
      note: "video post: VideoObject suppressed — videoUrl missing or not YouTube",
    };
  }
  return { status: "pass", value: "Article+VideoObject" };
}

// ---- Audit runners --------------------------------------------------------

function auditPost(courseSlug, courseName, post) {
  const checks = {
    title: checkTitle(post.title, courseName),
    description: checkLength(
      post.description,
      POST_DESC_PASS,
      POST_DESC_WARN,
      "description"
    ),
    body: checkBody(courseSlug, post),
    media: checkMedia(post),
    schema: checkSchema(post),
    published: checkPublished(post),
  };
  const score = Object.values(checks).reduce(
    (sum, c) => sum + scoreOf(c.status),
    0
  );
  const max = Object.keys(checks).length * 2;
  const failCount = Object.values(checks).filter(
    (c) => c.status === "fail"
  ).length;
  const warnCount = Object.values(checks).filter(
    (c) => c.status === "warn"
  ).length;
  return {
    url: `/courses/${courseSlug}/${post.slug}`,
    courseSlug,
    postSlug: post.slug,
    title: post.title,
    score,
    max,
    pct: Math.round((score / max) * 100),
    failCount,
    warnCount,
    checks,
  };
}

function auditCourse(course) {
  const checks = {
    name: checkTitle(course.name, null),
    description: checkLength(
      course.description,
      COURSE_DESC_PASS,
      COURSE_DESC_WARN,
      "description"
    ),
    banner: course.banner?.url
      ? { status: "pass", value: course.banner.url }
      : { status: "fail", value: null, note: "course banner missing" },
    chapters: (course.chapters || []).length
      ? { status: "pass", value: (course.chapters || []).length }
      : { status: "fail", value: 0, note: "no chapters" },
  };
  const score = Object.values(checks).reduce(
    (sum, c) => sum + scoreOf(c.status),
    0
  );
  const max = Object.keys(checks).length * 2;
  return {
    url: `/courses/${course.slug}`,
    courseSlug: course.slug,
    name: course.name,
    score,
    max,
    pct: Math.round((score / max) * 100),
    checks,
  };
}

// ---- Reporting ------------------------------------------------------------

function summarize(courseResults, postResults) {
  const total = postResults.length;
  const buckets = { pass: 0, warn: 0, fail: 0 };
  const criteriaFails = {};
  for (const p of postResults) {
    if (p.failCount > 0) buckets.fail++;
    else if (p.warnCount > 0) buckets.warn++;
    else buckets.pass++;
    for (const [key, check] of Object.entries(p.checks)) {
      if (check.status === "fail") {
        criteriaFails[key] = (criteriaFails[key] || 0) + 1;
      }
    }
  }
  return {
    posts: { total, ...buckets },
    courses: {
      total: courseResults.length,
      fail: courseResults.filter((c) =>
        Object.values(c.checks).some((x) => x.status === "fail")
      ).length,
    },
    criteriaFails,
  };
}

function fmtPct(n) {
  return `${String(n).padStart(3)}%`;
}

function printReport(summary, courseResults, postResults, topN) {
  const sorted = [...postResults].sort((a, b) => a.score - b.score);
  const weakest = sorted.slice(0, topN);

  console.log("\n=== SEO Content Audit ===");
  console.log(`Courses: ${summary.courses.total} (${summary.courses.fail} with FAIL)`);
  console.log(
    `Posts:   ${summary.posts.total} | pass=${summary.posts.pass} warn=${summary.posts.warn} fail=${summary.posts.fail}`
  );
  console.log("\n-- Post-level FAIL counts by criterion --");
  for (const [k, v] of Object.entries(summary.criteriaFails).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${k.padEnd(12)} ${v}`);
  }

  console.log("\n-- Courses --");
  for (const c of courseResults) {
    const tag = c.pct === 100 ? "PASS" : c.pct >= 75 ? "WARN" : "FAIL";
    console.log(`  [${tag}] ${fmtPct(c.pct)} ${c.courseSlug}`);
    for (const [key, check] of Object.entries(c.checks)) {
      if (check.status !== "pass") {
        console.log(`        - ${key}: ${check.status.toUpperCase()} (${check.note || check.value})`);
      }
    }
  }

  console.log(`\n-- Bottom ${topN} weakest posts --`);
  for (const p of weakest) {
    console.log(
      `  ${fmtPct(p.pct)} ${p.url}  (fails:${p.failCount} warns:${p.warnCount})`
    );
    for (const [key, check] of Object.entries(p.checks)) {
      if (check.status === "fail") {
        console.log(`        - ${key}: ${check.note}`);
      }
    }
  }
}

// ---- Main -----------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes("--json");
  const warnAsFail = args.includes("--warn-as-fail");
  const topIdx = args.indexOf("--top");
  const topN = topIdx >= 0 ? Number(args[topIdx + 1]) || 15 : 15;

  if (!fs.existsSync(COURSES_INDEX)) {
    console.error(
      `Missing ${COURSES_INDEX}. Run "npm run content:build" first.`
    );
    process.exit(2);
  }

  const idx = JSON.parse(fs.readFileSync(COURSES_INDEX, "utf8"));
  const courseResults = [];
  const postResults = [];

  for (const course of idx.courses || []) {
    courseResults.push(auditCourse(course));
    for (const chapter of course.chapters || []) {
      for (const post of chapter.posts || []) {
        if (!post?.slug) continue;
        postResults.push(auditPost(course.slug, course.name, post));
      }
    }
  }

  const summary = summarize(courseResults, postResults);
  const date = new Date().toISOString().slice(0, 10);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `audit-${date}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        rubric: {
          postDescPass: POST_DESC_PASS,
          postDescWarn: POST_DESC_WARN,
          postTitleMin: POST_TITLE_MIN,
          postTitleMax: POST_TITLE_MAX,
          postBodyPass: POST_BODY_PASS,
          postBodyWarn: POST_BODY_WARN,
          courseDescPass: COURSE_DESC_PASS,
          courseDescWarn: COURSE_DESC_WARN,
        },
        summary,
        courses: courseResults,
        posts: postResults,
      },
      null,
      2
    )
  );

  if (jsonOnly) {
    console.log(outPath);
  } else {
    printReport(summary, courseResults, postResults, topN);
    console.log(`\nFull report: ${outPath}`);
  }

  const hasFail =
    summary.posts.fail > 0 ||
    summary.courses.fail > 0 ||
    (warnAsFail && summary.posts.warn > 0);
  process.exit(hasFail ? 1 : 0);
}

main();
