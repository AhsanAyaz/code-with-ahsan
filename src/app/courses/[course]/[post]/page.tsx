import qs from "qs";
import { notFound } from "next/navigation";
// @ts-ignore
import {
  STRAPI_COURSE_POPULATE_OBJ,
  STRAPI_POST_QUERY_OBJ,
} from "@/lib/strapiQueryHelpers";
// @ts-ignore
import Course from "@/classes/Course.class";
// @ts-ignore
import Post from "@/classes/Post.class";
// @ts-ignore
import { getNextAndPreviousPosts } from "@/services/PostService";
import PostDetail from "./PostDetail";
import siteMetadata from "@/data/siteMetadata";

async function getCourseAndPost(courseSlug: string, postSlug: string) {
  const strapiUrl = process.env.STRAPI_URL;
  const strapiAPIKey = process.env.STRAPI_API_KEY;

  if (!strapiUrl || !strapiAPIKey) {
    return null;
  }

  // Course query
  const courseQuery = qs.stringify(
    {
      fields: ["name", "slug", "description"],
      populate: STRAPI_COURSE_POPULATE_OBJ,
      filters: {
        slug: {
          $eq: courseSlug,
        },
      },
    },
    {
      encodeValuesOnly: true,
    }
  );

  // Post query
  const postQuery = qs.stringify(
    {
      ...STRAPI_POST_QUERY_OBJ,
      filters: {
        slug: {
          $eq: postSlug,
        },
      },
    },
    {
      encodeValuesOnly: true,
    }
  );

  const courseUrl = `${strapiUrl}/api/courses?${courseQuery}`;
  const postUrl = `${strapiUrl}/api/posts?${postQuery}`;

  try {
    const [courseResp, postResp] = await Promise.all([
      fetch(courseUrl, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${strapiAPIKey}`,
        },
        next: { revalidate: 60 },
      }),
      fetch(postUrl, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${strapiAPIKey}`,
        },
        next: { revalidate: 60 },
      }),
    ]);

    if (!courseResp.ok || !postResp.ok) return null;

    const courseData = await courseResp.json();
    const postData = await postResp.json();

    if (!courseData.data.length || !postData.data.length) {
      return null;
    }

    const course = new Course(courseData.data[0]);
    course.chapters.sort((a: any, b: any) => a.order - b.order);
    const post = new Post(postData.data[0]);
    const { nextPost, previousPost } = getNextAndPreviousPosts(course, post);

    return { course, post, nextPost, previousPost };
  } catch (error) {
    console.warn(`Failed to fetch data for ${courseSlug}/${postSlug}:`, error);
    return null;
  }
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

  // Serialize objects for client component
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
