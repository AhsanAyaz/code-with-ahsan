import { notFound } from "next/navigation";
import Course from "@/classes/Course.class";
import CourseDetail from "./CourseDetail";
import siteMetadata from "@/data/siteMetadata";
import { getCourseBySlug, getCourses } from "@/lib/content/contentProvider";

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

  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.name,
    description: course.description ?? siteMetadata.description,
    url: `${BASE_URL}/courses/${slug}`,
    ...(course.banner ? { image: course.banner } : {}),
    provider: {
      "@type": "Organization",
      name: "Code with Ahsan",
      sameAs: BASE_URL,
    },
    ...(course.authors?.[0]?.name
      ? { author: { "@type": "Person", name: course.authors[0].name } }
      : {}),
  };

  return (
    <div className="page-padding">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }}
      />
      <CourseDetail course={coursePlain} />
    </div>
  );
}
