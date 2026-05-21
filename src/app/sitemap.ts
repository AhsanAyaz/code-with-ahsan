import type { MetadataRoute } from "next";
import { getCourses, getEvents } from "@/lib/content/contentProvider";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.codewithahsan.dev";

// Public static routes verified to exist under src/app/.
// Excludes all 18 auth-gated paths listed in public/robots.txt
// (admin/*, profile, mentorship/{dashboard,goals,my-matches,onboarding,requests,admin},
// projects/{my,new}, roadmaps/{my,new}).
const STATIC_PATHS = [
  "/about",
  "/ambassadors",
  "/ambassadors/apply",
  "/books",
  "/books/mastering-angular-signals",
  "/community",
  "/courses",
  "/events",
  "/events/cwa-promptathon/2026",
  "/events/cwa-promptathon/2026/sponsorship",
  "/events/hackstack/2023",
  "/gear",
  "/logic-buddy",
  "/mentorship",
  "/mentorship/browse",
  "/mentorship/mentors",
  "/privacy",
  "/projects",
  "/projects/discover",
  "/raffle",
  "/rates",
  "/roadmaps",
  "/terms",
] as const;

function toDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [courses, events] = await Promise.all([getCourses(), getEvents()]);

  const homepage: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const eventEntries: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${BASE_URL}/events/${event.slug}`,
    lastModified: toDate(event.endDate ?? event.date, now),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const courseEntries: MetadataRoute.Sitemap = courses.flatMap((course) => {
    const courseLastModified = toDate(course.publishedAt, now);

    const detail = {
      url: `${BASE_URL}/courses/${course.slug}`,
      lastModified: courseLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };

    const resources = {
      url: `${BASE_URL}/courses/${course.slug}/resources`,
      lastModified: courseLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.3,
    };

    const submissions = {
      url: `${BASE_URL}/courses/${course.slug}/submissions`,
      lastModified: courseLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.3,
    };

    const posts = (course.chapters ?? []).flatMap((chapter) =>
      (chapter.posts ?? [])
        .filter((post) => !!post?.slug)
        .map((post) => ({
          url: `${BASE_URL}/courses/${course.slug}/${post.slug}`,
          lastModified: toDate(post.publishedAt, courseLastModified),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        }))
    );

    return [detail, resources, submissions, ...posts];
  });

  return [...homepage, ...staticEntries, ...eventEntries, ...courseEntries];
}
