import Course from "@/classes/Course.class";
import ResourcesLinks from "@/components/ResourcesLinks";
import { getCourseBySlug, getCourses } from "@/lib/content/contentProvider";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.codewithahsan.dev";

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
  const courseData = await getCourseBySlug(slug);

  if (!courseData) {
    return {
      title: "Resources - Course Not Found",
      alternates: {
        canonical: `${BASE_URL}/courses`,
      },
      robots: { index: false, follow: true },
    };
  }

  return {
    title: `Resources - ${courseData.name}`,
    alternates: {
      canonical: `${BASE_URL}/courses/${slug}/resources`,
    },
    robots: { index: false, follow: true },
  };
}

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course: courseSlug } = await params;
  const courseData = await getCourseBySlug(courseSlug);

  if (!courseData) {
    return <div className="text-center p-10">Course not found</div>;
  }

  const course = new Course(courseData);

  return (
    <div className="page-padding">
      <header className="mb-6">
        <h1 className="text-4xl text-center">Resources</h1>
        <h2 className="text-xl mt-2 text-center text-base-content/70">
          {course.name}
        </h2>
      </header>

      <div className="max-w-4xl mx-auto">
        <ResourcesLinks
          noHeading={true}
          heading=""
          resources={course.resources || []}
        />
      </div>
    </div>
  );
}
