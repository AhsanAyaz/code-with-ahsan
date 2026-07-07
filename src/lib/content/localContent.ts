import coursesData from "@/content/courses.generated.json";
import bannersData from "@/content/banners.json";
import eventsData from "@/content/events.generated.json";
import type { BannerContent, CourseContent, EventContent, PostContent } from "@/types/content";

export function getLocalCourses(): CourseContent[] {
  const courses = (coursesData?.courses || []) as CourseContent[];
  return courses.filter((course) => !!course.publishedAt && course.isVisible !== false);
}

export function getLocalCourseBySlug(slug: string): CourseContent | null {
  return getLocalCourses().find((course) => course.slug === slug) || null;
}

export function getLocalPosts(): PostContent[] {
  const posts: PostContent[] = [];
  getLocalCourses().forEach((course) => {
    (course.chapters || []).forEach((chapter) => {
      (chapter.posts || []).forEach((post) => {
        posts.push(post);
      });
    });
  });
  return posts;
}

export function getLocalPostBySlug(slug: string): PostContent | null {
  return getLocalPosts().find((post) => post.slug === slug) || null;
}

export function getLocalBanners(): BannerContent[] {
  const banners = (bannersData?.banners || []) as BannerContent[];
  return banners
    .map((banner) => ({
      ...banner,
      isActive: banner.isActive !== false,
      dismissable: !!banner.dismissable,
    }))
    .filter((banner) => banner.isActive);
}

export function getLocalEvents(): EventContent[] {
  const events = (eventsData?.events || []) as EventContent[];
  return events.filter((event) => event.isVisible !== false);
}

export function getLocalEventBySlug(slug: string): EventContent | null {
  // Search ALL events including hidden ones — direct slug visit should still work for previews
  const all = (eventsData?.events || []) as EventContent[];
  return all.find((event) => event.slug === slug) || null;
}
