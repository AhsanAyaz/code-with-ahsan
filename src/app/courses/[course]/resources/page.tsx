import Course from "@/classes/Course.class";
import ResourcesLinks from "@/components/ResourcesLinks";
import { getCourseBySlug } from "@/lib/content/contentProvider";

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
