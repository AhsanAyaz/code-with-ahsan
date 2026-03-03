import siteMetadata from "@/data/siteMetadata";
import Course from "@/classes/Course.class";
import CoursesList from "./CoursesList";
import { getCourses } from "@/lib/content/contentProvider";

async function getCoursesForPage() {
  const courses = await getCourses();
  return courses.map((course) => new Course(course));
}

export const metadata = {
  title: `Courses - ${siteMetadata.title}`,
  description:
    "Browse comprehensive courses and tutorials to master web development and programming.",
  openGraph: {
    title: `Courses - ${siteMetadata.title}`,
    description:
      "Browse comprehensive courses and tutorials to master web development and programming.",
    images: ["/images/courses-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `Courses - ${siteMetadata.title}`,
    description:
      "Browse comprehensive courses and tutorials to master web development and programming.",
    images: ["/images/courses-og.png"],
  },
};

export default async function CoursesPage() {
  const courses = await getCoursesForPage();

  return (
    <div className="page-padding">
      <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-base-content sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 text-center mt-4 mb-4 md:mb-8">
        Courses
      </h1>
      <CoursesList coursesStr={JSON.stringify(courses)} />
    </div>
  );
}
