import { notFound } from "next/navigation";
import Course from "@/classes/Course.class";
import Post from "@/classes/Post.class";
import { getNextAndPreviousPosts } from "@/services/PostService";
import PostDetail from "./PostDetail";
import siteMetadata from "@/data/siteMetadata";
import { getCourseBySlug, getPostBySlug } from "@/lib/content/contentProvider";

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
    };
  }

  const { post, course } = data;

  return {
    title: `${post.title} - ${course.name}`,
    description: post.description || siteMetadata.description,
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

  return (
    <div className="page-padding">
      <PostDetail
        course={JSON.parse(JSON.stringify(course))}
        post={JSON.parse(JSON.stringify(post))}
        nextPost={nextPost}
        previousPost={previousPost}
      />
    </div>
  );
}
