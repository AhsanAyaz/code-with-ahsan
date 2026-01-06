"use client";

import React, { useEffect, useState, useCallback, useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { getApp } from "firebase/app";
import { onSnapshot, updateDoc } from "firebase/firestore";

// @ts-ignore
import logAnalyticsEvent from "@/lib/utils/logAnalyticsEvent";
// @ts-ignore
import { getEnrollmentDoc, unEnroll } from "@/services/EnrollmentService";
// @ts-ignore
import { getCurrentUser } from "@/services/AuthService";
// @ts-ignore
import { CoursesList } from "@/components/courses/CoursesList";
import Button from "@/components/Button";
// @ts-ignore
import { AuthContext } from "@/contexts/AuthContext";
// @ts-ignore
import SubmissionWrapper from "@/components/SubmissionWrapper";
// @ts-ignore
import YoutubePlayer from "@/components/YouTubePlayer";
// @ts-ignore
import YouTubeComment from "@/components/YouTubeComment";
import Spinner from "@/components/Spinner";
// @ts-ignore
import ResourcesLinks from "@/components/ResourcesLinks";
// @ts-ignore
import LegitMarkdown from "@/components/LegitMarkdown";
// @ts-ignore
import NewsletterForm from "@/components/NewsletterForm";
import siteMetadata from "@/data/siteMetadata";

const auth = getAuth(getApp());

export default function PostDetail({
  course,
  post,
  nextPost,
  previousPost,
}: {
  course: any;
  post: any;
  nextPost: any;
  previousPost: any;
}) {
  const { setShowLoginPopup } = useContext(AuthContext);
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<any>(null);
  const [enrolled, setEnrolled] = useState(false);
  const router = useRouter();
  // @ts-ignore
  const currentRoute = `/courses/${course.slug}/${post.slug}`; // Approximated for now

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const goToPost = (slug: string) => {
    router.push(`/courses/${course.slug}/${slug}`);
  };

  const getMarked = useCallback(
    async (user: any) => {
      if (!user) {
        return;
      }
      const enrollment = await getEnrollmentDoc({ course, attendee: user });
      const isEnrolled = enrollment.exists();
      setEnrolled(isEnrolled);
      if (isEnrolled) {
        setMarked(enrollment.data().marked);
      }
    },
    [course]
  );

  const enrollUser = async (event: any) => {
    event?.stopPropagation();
    const attendee = await getCurrentUser();
    if (!attendee) {
      setShowLoginPopup(true);
      return;
    }
    await getEnrollmentDoc({ course, attendee }, true);
    router.push(`/courses/${course.slug}`);
    setEnrolled(true);
    logAnalyticsEvent("course_joined", {
      courseSlug: course.slug,
    });
  };

  const markAsComplete = async () => {
    const attendee = await getCurrentUser();
    if (!attendee) {
      setShowLoginPopup(true);
      return;
    }
    const enrollmentDoc = await getEnrollmentDoc({ course, attendee }, true);
    await updateDoc(enrollmentDoc.ref, {
      marked: {
        ...marked,
        [post.slug]: true,
      },
    });
    setMarked({
      ...marked,
      [post.slug]: true,
    });
    if (!enrolled) {
      setEnrolled(true);
    }
    logAnalyticsEvent("post_marked_complete", {
      courseSlug: course.slug,
      postSlug: post.slug,
    });
  };

  const markAsIncomplete = async () => {
    const attendee = await getCurrentUser();
    if (!attendee) {
      setShowLoginPopup(true);
      return;
    }
    const enrollmentDoc = await getEnrollmentDoc({ course, attendee });
    await updateDoc(enrollmentDoc.ref, {
      marked: {
        ...marked,
        [post.slug]: false,
      },
    });
    setMarked({
      ...marked,
      [post.slug]: false,
    });
    logAnalyticsEvent("post_marked_incomplete", {
      courseSlug: course.slug,
      postSlug: post.slug,
    });
  };

  const getComments = async () => {
    if (!post.embed?.id) return;
    setLoadingComments(true);
    try {
      const resp = await fetch(
        `/api/youtube/comments?videoId=${post.embed.id}`
      );
      const data = await resp.json();
      setComments(data.comments || []);
    } catch (err) {
      console.log({ err });
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    const sub = auth.onAuthStateChanged((user) => {
      if (user) {
        getMarked(user);
      } else {
        setMarked({});
        setEnrolled(false);
      }
      setUser(user);
    });

    return () => {
      sub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.slug]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let enrollmentSub: any;
    getEnrollmentDoc({ course: course, attendee: user }).then((doc) => {
      enrollmentSub = onSnapshot(doc.ref, (snapshot) => {
        const exists = snapshot.exists();
        setEnrolled(exists);
      });
    });

    return () => {
      if (enrollmentSub) enrollmentSub();
    };
  }, [user, course.slug]);

  useEffect(() => {
    logAnalyticsEvent("course_post_viewed", {
      courseSlug: course.slug,
      postSlug: post.slug,
    });
    getComments();
  }, [post.slug, course.slug]);

  return (
    <div className="flex flex-col-reverse md:grid md:grid-cols-3 gap-4 px-4 sm:px-8 md:px-12 lg:px-16">
      <aside className="chapters col-span-1">
        {course && (
          <CoursesList
            enrolled={enrolled}
            course={course}
            activePost={post}
            markedPosts={marked}
            enrollUser={enrollUser}
          />
        )}
        {course.resources?.length ? (
          <div className="my-6">
            <h5 className="text-center md:text-left mb-4">Resources</h5>
            {/* @ts-ignore */}
            <Link
              href={`/courses/${course.slug}/resources`}
              className={`flex items-center gap-4 justify-between px-4 py-2 cursor-pointer bg-gray-700 text-white hover:bg-gray-600 rounded-lg border border-gray-600 hover:border-primary transition-colors shadow-lg`}
            >
              <span className="break-words">View Resources</span>
            </Link>
          </div>
        ) : null}
        <div className="my-6">
          <h5 className="text-center md:text-left mb-4">Project Submissions</h5>
          {/* @ts-ignore */}
          <Link
            href={`/courses/${course.slug}/submissions`}
            className={`flex items-center gap-4 justify-between px-4 py-2 cursor-pointer bg-gray-700 text-white hover:bg-gray-600 rounded-lg border border-gray-600 hover:border-primary transition-colors shadow-lg`}
          >
            <span className="break-words">View Submissions</span>
          </Link>
        </div>
        <div className="my-6">
          {enrolled ? (
            <button
              onClick={async () => {
                const attendee = await getCurrentUser();
                const sure = confirm(
                  `Are you sure you want to leave the course? This will delete all your progress in the course including any submitted assignments. Also, we hate to see you go :(`
                );
                if (sure) {
                  await unEnroll({ course, attendee });
                  setEnrolled(false);
                  setMarked({});
                }
              }}
              className="px-4 text-white uppercase mb-6 hover:bg-red-500 hover:shadow-md rounded-md py-2 w-full bg-red-400 dark:bg-red-500 dark:hover:bg-red-600"
            >
              Leave Course
            </button>
          ) : (
            <Button
              onClick={async () => {
                const attendee = await getCurrentUser();
                if (!attendee) {
                  setShowLoginPopup(true);
                  return;
                }
                await getEnrollmentDoc({ course, attendee }, true);
                setEnrolled(true);
              }}
              color="primary"
              className="px-4 uppercase mb-6 py-3 w-full border-none rounded-none"
              title="Enroll"
              href={undefined}
            >
              Enroll
            </Button>
          )}
        </div>
      </aside>
      <main className="flex-1 md:min-h-[300px] col-span-2">
        {/* Post Content */}
        <header className="mb-6">
          <h1 className="text-4xl text-center">{post.title}</h1>
        </header>
        {post.hasAssignment && (
          <SubmissionWrapper
            user={user}
            submissionParams={{
              courseId: course.slug,
              postId: post.slug,
            }}
            submitModalTitle={"Submit Assignment"}
            submitButtonText={"Submit Assignment"}
            submissionDone={() => {
              console.log("submitted");
            }}
            submissionUrl={`assignments/${course.slug}/${user?.uid}/${post.slug}`}
            enrollmentChanged={() => {}}
          >
            {null}
          </SubmissionWrapper>
        )}
        {post.type === "video" && (
          <section className="embed-container mb-4">
            {post.embed?.isYouTube ? (
              <YoutubePlayer
                videoId={post.embed.id}
                title={post.title}
                timestamp={post.embed.ts}
                thumbnail={post.thumbnail}
              />
            ) : (
              <iframe
                src={post.embedUrl}
                title={post.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            )}
          </section>
        )}
        <section className="my-4 flex justify-end">
          <div className="flex-1">
            {previousPost && (
              <Button
                color="primary"
                onClick={() => {
                  goToPost(previousPost);
                }}
                title="Previous Post"
                className="px-4 py-2"
                href={undefined}
              >
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-4">
            {marked[post.slug] ? (
              <Button
                color="green"
                onClick={markAsIncomplete}
                title="Mark as Incomplete"
                className="px-4 py-2"
                href={undefined}
              >
                Completed
              </Button>
            ) : (
              <button
                onClick={markAsComplete}
                className="py-2 text-base-content px-4 rounded-md font-bold"
              >
                Mark as Complete
              </button>
            )}
            {nextPost && (
              <Button
                color="primary"
                onClick={() => {
                  goToPost(nextPost);
                }}
                title="Next Post"
                className="px-4 py-2"
                href={undefined}
              >
                Next
              </Button>
            )}
          </div>
        </section>
        <section>
          {post.description && (
            <section className="mt-8 mb-4">
              <p>{post.description}</p>
            </section>
          )}
        </section>
        {post.type === "video" && post.embed?.isYouTube ? (
          <>
            <div className="flex gap-4 items-center justify-end mb-8">
              {/* @ts-ignore */}
              <Button
                color="primary"
                href={`https://youtu.be/${post.embed.id}`}
                title="Like on YouTube"
                className="px-4 py-2"
              >
                Like
              </Button>

              {/* @ts-ignore */}
              <Button
                color="primary"
                href={`https://youtu.be/${post.embed.id}`}
                title="Comment on YouTube"
                className="px-4 py-2"
              >
                Post Comment
              </Button>
            </div>
            <ul className="comments-container space-y-6">
              {loadingComments ? (
                <div className="flex w-full justify-center items-center">
                  <Spinner color="primary" />
                </div>
              ) : (
                comments.map((comment: any) => {
                  return (
                    <YouTubeComment
                      key={comment.topLevelComment.id}
                      comment={comment}
                      videoLink={`https://youtu.be/${post.embed.id}`}
                    />
                  );
                })
              )}
            </ul>
          </>
        ) : null}

        {post.article && (
          <section>
            {post.article && (
              <LegitMarkdown
                components={{
                  a: (props: any) => (
                    <a className="text-yellow-300" target={"_blank"} {...props}>
                      {props.children}
                    </a>
                  ),
                }}
              >
                {post.article}
              </LegitMarkdown>
            )}
          </section>
        )}

        <section>
          {post.resources?.length > 0 && (
            <section className="mt-4">
              <ResourcesLinks
                resources={post.resources}
                noHeading={false}
                heading={"Resources"}
              />
            </section>
          )}
        </section>
        <div className="flex items-center justify-center pt-4">
          <NewsletterForm />
        </div>
      </main>
    </div>
  );
}
