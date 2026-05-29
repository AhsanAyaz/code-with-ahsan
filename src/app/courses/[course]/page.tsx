import { notFound } from "next/navigation";
import Course from "@/classes/Course.class";
import CourseDetail from "./CourseDetail";
import siteMetadata from "@/data/siteMetadata";
import { getCourseBySlug, getCourses } from "@/lib/content/contentProvider";
import { buildCourseLd } from "@/lib/seo/courseSchema";
import { buildBreadcrumbLd } from "@/lib/seo/breadcrumbSchema";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.codewithahsan.dev";

async function getCourse(slug: string) {
  const data = await getCourseBySlug(slug);
  if (!data) return null;

  const course = new Course(data);
  course.chapters.sort(
    (a: { order?: number | string }, b: { order?: number | string }) =>
      (Number(a.order) || 0) - (Number(b.order) || 0)
  );
  return course;
}

export async function generateStaticParams() {
  const courses = await getCourses();
  return courses
    .filter((c) => !!c?.slug)
    .map((c) => ({ course: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course: slug } = await params;
  const course = await getCourse(slug);

  if (!course) {
    return {
      title: "Course Not Found",
      description: "The requested course could not be found.",
      alternates: {
        canonical: `${BASE_URL}/courses`,
      },
    };
  }

  return {
    title: `${course.name} - ${siteMetadata.title}`,
    description: course.description || siteMetadata.description,
    alternates: {
      canonical: `${BASE_URL}/courses/${slug}`,
    },
    openGraph: {
      title: course.name,
      description: course.description || siteMetadata.description,
      images: course.banner ? [course.banner] : [],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course: slug } = await params;
  const course = await getCourse(slug);

  if (!course) {
    notFound();
  }

  const coursePlain = JSON.parse(JSON.stringify(course));

  const courseUrl = `${BASE_URL}/courses/${slug}`;
  const courseLd = buildCourseLd({
    name: course.name,
    description: course.description ?? siteMetadata.description,
    url: courseUrl,
    baseUrl: BASE_URL,
    imageUrl: course.banner || undefined,
    authorName: course.authors?.[0]?.name,
  });
  const breadcrumbLd = buildBreadcrumbLd([
    { name: "Home", url: `${BASE_URL}/` },
    { name: "Courses", url: `${BASE_URL}/courses` },
    { name: course.name, url: courseUrl },
  ]);

  return (
    <div className="page-padding">
      {courseLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <CourseDetail course={coursePlain} />
    </div>
  );
}
