import { notFound } from "next/navigation";
import Course from "@/classes/Course.class";
import Post from "@/classes/Post.class";
import { getNextAndPreviousPosts } from "@/services/PostService";
import PostDetail from "./PostDetail";
import siteMetadata from "@/data/siteMetadata";
import {
  getCourseBySlug,
  getCourses,
  getPostBySlug,
} from "@/lib/content/contentProvider";
import { buildVideoObjectLd } from "@/lib/seo/videoSchema";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.codewithahsan.dev";

async function getCourseAndPost(courseSlug: string, postSlug: string) {
  const [courseRaw, postRaw] = await Promise.all([
    getCourseBySlug(courseSlug),
    getPostBySlug(postSlug),
  ]);

  if (!courseRaw || !postRaw) return null;

  const chapter = courseRaw.chapters.find((c) => c.id === postRaw.chapter?.id);
  if (!chapter) return null;

  const course = new Course(courseRaw);
  course.chapters.sort(
    (a: { order?: number | string }, b: { order?: number | string }) =>
      (Number(a.order) || 0) - (Number(b.order) || 0)
  );

  const post = new Post({
    ...postRaw,
    chapter: {
      id: chapter.id,
      name: chapter.name,
    },
  });

  const { nextPost, previousPost } = getNextAndPreviousPosts(course, post);

  return { course, post, nextPost, previousPost };
}

export async function generateStaticParams() {
  const courses = await getCourses();
  return courses.flatMap((c) =>
    (c.chapters ?? []).flatMap((ch) =>
      (ch.posts ?? [])
        .filter((p) => !!p?.slug)
        .map((p) => ({ course: c.slug, post: p.slug }))
    )
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string; post: string }>;
}) {
  const { course: courseSlug, post: postSlug } = await params;
  const data = await getCourseAndPost(courseSlug, postSlug);

  if (!data) {
    return {
      title: "Post Not Found",
      description: "The requested post could not be found.",
      alternates: {
        canonical: `${BASE_URL}/courses`,
      },
    };
  }

  const { post, course } = data;

  return {
    title: `${post.title} - ${course.name}`,
    description: post.description || siteMetadata.description,
    alternates: {
      canonical: `${BASE_URL}/courses/${courseSlug}/${postSlug}`,
    },
    openGraph: {
      title: `${post.title} - ${course.name}`,
      description: post.description || siteMetadata.description,
      images:
        post.thumbnail || course.banner
          ? [post.thumbnail || course.banner]
          : [],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ course: string; post: string }>;
}) {
  const { course: courseSlug, post: postSlug } = await params;
  const data = await getCourseAndPost(courseSlug, postSlug);

  if (!data) {
    notFound();
  }

  const { course, post, nextPost, previousPost } = data;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description ?? siteMetadata.description,
    url: `${BASE_URL}/courses/${courseSlug}/${postSlug}`,
    ...(post.publishedAt
      ? { datePublished: post.publishedAt, dateModified: post.publishedAt }
      : {}),
    ...(post.thumbnail || course.banner
      ? { image: post.thumbnail || course.banner }
      : {}),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/courses/${courseSlug}/${postSlug}`,
    },
    author: {
      "@type": "Person",
      name: course.authors?.[0]?.name ?? "Muhammad Ahsan Ayaz",
    },
    publisher: {
      "@type": "Organization",
      name: "Code with Ahsan",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/static/images/logo.png`,
      },
    },
  };

  const pageUrl = `${BASE_URL}/courses/${courseSlug}/${postSlug}`;
  const videoLd =
    post.type === "video" && post.videoUrl
      ? buildVideoObjectLd({
          name: post.title,
          description: post.description ?? siteMetadata.description,
          uploadDate: post.publishedAt ?? new Date().toISOString(),
          videoUrl: post.videoUrl,
          thumbnailOverride: post.thumbnail || course.banner,
          pageUrl,
        })
      : null;

  return (
    <div className="page-padding">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      {videoLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoLd) }}
        />
      )}
      <PostDetail
        course={JSON.parse(JSON.stringify(course))}
        post={JSON.parse(JSON.stringify(post))}
        nextPost={nextPost}
        previousPost={previousPost}
      />
    </div>
  );
}
