import coursesData from "@/content/courses.generated.json";
import bannersData from "@/content/banners.json";
import ratesData from "@/content/rates.json";
import type {
  BannerContent,
  CourseContent,
  PostContent,
  RateCardContent,
} from "@/types/content";

export function getLocalCourses(): CourseContent[] {
  const courses = (coursesData?.courses || []) as CourseContent[];
  return courses.filter((course) => !!course.publishedAt);
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

export function getLocalRateCard(): RateCardContent | null {
  return (ratesData?.rateCard || null) as RateCardContent | null;
}
