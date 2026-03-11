import Image from "next/image";
import Link from "next/link";
import type { CourseContent } from "@/types/content";

type Props = {
  courses: CourseContent[];
};

export default function CoursesSection({ courses }: Props) {
  return (
    <section className="border-t border-base-300 bg-base-100 py-16">
      <div className="page-padding">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-base-content mb-8">
            Courses &amp; Tutorials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const href = course.isExternal && course.externalCourseUrl
                ? course.externalCourseUrl
                : `/courses/${course.slug}`;
              const bannerUrl = course.banner?.url;

              return (
                <div
                  key={course.id}
                  className="bg-base-100 border border-base-300 rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col"
                >
                  {/* Banner */}
                  <div className="relative w-full aspect-video bg-black">
                    {bannerUrl ? (
                      <Image
                        src={bannerUrl}
                        alt={course.name}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="text-4xl font-bold text-primary/40">
                          {course.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    {course.externalStudentsCount != null && (
                      <span className="absolute top-3 right-3 badge badge-primary badge-sm font-semibold">
                        {course.externalStudentsCount.toLocaleString()}+ students
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-1 p-5 gap-3">
                    <h3 className="font-bold text-base-content text-lg leading-tight">
                      {course.name}
                    </h3>
                    {course.description && (
                      <p className="text-sm text-base-content/70 leading-relaxed line-clamp-2 flex-1">
                        {course.description}
                      </p>
                    )}
                    <Link
                      href={href}
                      target={course.isExternal ? "_blank" : undefined}
                      rel={course.isExternal ? "noopener noreferrer" : undefined}
                      className="btn btn-primary btn-sm mt-auto w-full"
                    >
                      {course.isExternal ? "Enroll" : "View Course"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
