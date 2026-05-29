// Course JSON-LD builder. Centralizes the shape so the audit script + the page
// agree on what gets emitted. See:
//   - https://developers.google.com/search/docs/appearance/structured-data/course
//   - .planning/phases/tools-seo-indexability-uplift/02-course-schema-and-breadcrumbs-PLAN.md

const SITE_NAME = "Code with Ahsan";

export interface CourseSchemaInput {
  name: string;
  description: string;
  url: string;
  baseUrl: string;
  imageUrl?: string;
  authorName?: string;
}

export function buildCourseLd(
  input: CourseSchemaInput
): Record<string, unknown> | null {
  const name = (input.name || "").trim();
  const description = (input.description || "").trim();
  if (!name || !description) return null;

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    url: input.url,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: input.baseUrl,
      sameAs: input.baseUrl,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: "PT1H",
    },
  };

  if (input.imageUrl) ld.image = input.imageUrl;
  if (input.authorName) {
    ld.author = { "@type": "Person", name: input.authorName };
  }

  return ld;
}
