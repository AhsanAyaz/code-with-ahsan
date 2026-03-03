import { notFound } from "next/navigation";
import Course from "@/classes/Course.class";
import CourseDetail from "./CourseDetail";
import siteMetadata from "@/data/siteMetadata";
import { getCourseBySlug } from "@/lib/content/contentProvider";

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
    };
  }

  return {
    title: `${course.name} - ${siteMetadata.title}`,
    description: course.description || siteMetadata.description,
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

  return (
    <div className="page-padding">
      <CourseDetail course={coursePlain} />
    </div>
  );
}
