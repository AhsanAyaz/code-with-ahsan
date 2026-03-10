#!/usr/bin/env node

/**
 * One-time exporter from Strapi to local repo-managed content.
 * Writes:
 *  - src/content/_imports/courses.strapi.json (intermediate)
 *  - src/content/banners.json
 *  - src/content/rates.json
 * Then you can run:
 *  - npm run content:mdx:from-json
 *  - npm run content:build
 */

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const qs = require('qs');

const STRAPI_URL = process.env.STRAPI_URL;
const STRAPI_API_KEY = process.env.STRAPI_API_KEY;
const STRAPI_RATE_CARD_DOC_ID = process.env.STRAPI_RATE_CARD_DOC_ID || 'tyzwd2y813dr8sldugy0y51l';

if (!STRAPI_URL || !STRAPI_API_KEY) {
  console.error('Missing STRAPI_URL or STRAPI_API_KEY.');
  process.exit(1);
}

const contentDir = path.join(process.cwd(), 'src/content');
const importDir = path.join(process.cwd(), 'src/content/_imports');

const authHeaders = {
  Authorization: `Bearer ${STRAPI_API_KEY}`,
};

async function fetchJson(url) {
  const resp = await fetch(url, { headers: authHeaders });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed ${resp.status} for ${url}: ${text.slice(0, 300)}`);
  }
  return resp.json();
}

function writeJson(relPath, value) {
  const outPath = path.join(process.cwd(), relPath);
  fs.writeFileSync(outPath, JSON.stringify(value, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${relPath}`);
}

function normalizeCourse(course) {
  const normalizedAuthors = Array.isArray(course.authors)
    ? course.authors.map((author) => ({
        name: author.name,
        bio: author.bio || '',
        avatar: author.avatar?.url
          ? {
              url: author.avatar.url,
            }
          : null,
      }))
    : [];

  return {
    id: course.id,
    name: course.name,
    description: course.description || '',
    outline: course.outline || '',
    videoUrls: course.videoUrls || [],
    publishedAt: course.publishedAt || null,
    duration: course.duration || null,
    resources: Array.isArray(course.resources)
      ? course.resources.map((resource) => ({
          label: resource.label,
          url: resource.url,
          active: resource.active ?? true,
        }))
      : [],
    banner: course.banner?.url
      ? {
          url: course.banner.url,
        }
      : null,
    introVideoUrl: course.introVideoUrl || '',
    slug: course.slug,
    isExternal: !!course.isExternal,
    externalCourseUrl: course.externalCourseUrl || null,
    externalStudentsCount:
      typeof course.externalStudentsCount === 'number' ? course.externalStudentsCount : null,
    visibilityOrder: course.visibilityOrder ?? null,
    authors: normalizedAuthors,
    chapters: Array.isArray(course.chapters)
      ? course.chapters.map((chapter) => ({
          id: chapter.id,
          name: chapter.name,
          description: chapter.description || '',
          showName: chapter.showName ?? true,
          order: chapter.order ?? 0,
          posts: Array.isArray(chapter.posts)
            ? chapter.posts.map((post) => ({
                id: post.id,
                title: post.title,
                slug: post.slug,
                description: post.description || '',
                type: post.type || 'video',
                videoUrl: post.videoUrl || '',
                order: post.order ?? 0,
                hasAssignment: !!post.hasAssignment,
                publishedAt: post.publishedAt || null,
                resources: Array.isArray(post.resources)
                  ? post.resources.map((resource) => ({
                      label: resource.label,
                      url: resource.url,
                      active: resource.active ?? true,
                    }))
                  : [],
                article: post.article || '',
              }))
            : [],
        }))
      : [],
  };
}

function normalizeBanner(banner) {
  return {
    id: banner.id,
    content: banner.content || '',
    isActive: banner.isActive ?? true,
    dismissable: !!banner.dismissable,
    publishedAt: banner.publishedAt || null,
  };
}

function normalizeRateCard(post) {
  if (!post) return null;
  return {
    id: post.id,
    title: post.title || 'Creator Rate Card',
    slug: post.slug || 'rate-card',
    description: post.description || '',
    article: post.article || '',
    resources: Array.isArray(post.resources) ? post.resources : [],
  };
}

async function main() {
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }
  if (!fs.existsSync(importDir)) {
    fs.mkdirSync(importDir, { recursive: true });
  }

  const coursesQuery = qs.stringify(
    {
      sort: ['visibilityOrder:desc', 'publishedAt:desc'],
      filters: {
        publishedAt: {
          $notNull: true,
        },
      },
      pagination: {
        page: 1,
        pageSize: 200,
      },
      populate: {
        authors: {
          fields: ['name', 'bio'],
          populate: {
            avatar: true,
          },
        },
        chapters: {
          fields: ['name', 'description', 'showName', 'order'],
          populate: {
            posts: {
              fields: [
                'title',
                'slug',
                'description',
                'type',
                'videoUrl',
                'order',
                'hasAssignment',
                'publishedAt',
                'article',
              ],
              populate: {
                resources: {
                  fields: ['*'],
                },
              },
            },
          },
        },
        banner: true,
        resources: {
          fields: ['*'],
        },
      },
    },
    { encodeValuesOnly: true }
  );

  const rateQuery = qs.stringify(
    {
      fields: ['title', 'slug', 'description', 'article'],
      filters: {
        documentId: {
          $eq: STRAPI_RATE_CARD_DOC_ID,
        },
      },
      populate: {
        resources: {
          fields: ['*'],
        },
      },
    },
    { encodeValuesOnly: true }
  );

  const bannersQuery = qs.stringify(
    {
      sort: ['id:ASC'],
      pagination: {
        page: 1,
        pageSize: 25,
      },
    },
    { encodeValuesOnly: true }
  );

  const [coursesResp, rateResp, bannersResp] = await Promise.all([
    fetchJson(`${STRAPI_URL}/api/courses?${coursesQuery}`),
    fetchJson(`${STRAPI_URL}/api/posts?${rateQuery}`),
    fetchJson(`${STRAPI_URL}/api/banners?${bannersQuery}`),
  ]);

  const normalizedCourses = (coursesResp.data || []).map(normalizeCourse);
  const normalizedBanners = (bannersResp.data || []).map(normalizeBanner);
  const normalizedRateCard = normalizeRateCard((rateResp.data || [])[0] || null);

  writeJson('src/content/_imports/courses.strapi.json', {
    exportedAt: new Date().toISOString(),
    source: 'strapi',
    count: normalizedCourses.length,
    courses: normalizedCourses,
  });

  writeJson('src/content/banners.json', {
    exportedAt: new Date().toISOString(),
    source: 'strapi',
    count: normalizedBanners.length,
    banners: normalizedBanners,
  });

  writeJson('src/content/rates.json', {
    exportedAt: new Date().toISOString(),
    source: 'strapi',
    rateCard: normalizedRateCard,
  });

  console.log('Export complete. Run `npm run content:mdx:from-json && npm run content:build`.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
