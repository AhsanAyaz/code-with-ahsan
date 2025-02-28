import axios from 'axios'
import qs from 'qs'
import Course from '../../../classes/Course.class'
import Post from '../../../classes/Post.class'
import { useEffect, useState } from 'react'
import { getNextAndPreviousPosts } from '../../../services/PostService'
import STRAPI_CONFIG, {
  STRAPI_COURSE_POPULATE_OBJ,
  STRAPI_POST_QUERY_OBJ,
} from '../../../lib/strapiQueryHelpers'
import Button from '../../../components/Button'
import logAnalyticsEvent from '../../../lib/utils/logAnalyticsEvent'
import ResourcesLinks from '../../../components/ResourcesLinks'
import LegitMarkdown from '../../../components/LegitMarkdown'
import CoursePostLayout from '../../../layouts/CoursePostLayout'
import SubmissionWrapper from '../../../components/SubmissionWrapper'
import { getAuth } from 'firebase/auth'
import { getApp } from 'firebase/app'
import NewsletterForm from '../../../components/NewsletterForm'
import YoutubePlayer from '../../../components/YouTubePlayer'
import YouTubeComment from '../../../components/YouTubeComment'
import Spinner from '../../../components/Spinner'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

const auth = getAuth(getApp())

export async function getStaticPaths() {
  const query = qs.stringify(
    {
      fields: ['slug'],
      populate: {
        authors: {
          fields: ['name'],
          populate: {
            avatar: true,
          },
        },
        chapters: {
          fields: ['name'],
          populate: {
            posts: {
              fields: ['slug'],
            },
          },
        },
      },
    },
    {
      encodeValuesOnly: true,
    }
  )

  const url = `${strapiUrl}/api/courses?${query}`
  const coursesResp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${strapiAPIKey}`,
    },
  })

  const courses = coursesResp.data.data.map((course) => new Course(course))
  const paths = []

  courses.forEach((course) => {
    course.chapters?.forEach((chapter) => {
      chapter.posts?.forEach((post) => {
        paths.push({
          params: {
            course: course.slug,
            post: post.slug,
          },
        })
      })
    })
  })

  return {
    paths,
    fallback: false,
  }
}

export async function getStaticProps({ params }) {
  const { course: courseId, post: postId } = params

  // Course query
  const courseQuery = qs.stringify(
    {
      fields: ['name', 'slug', 'description'],
      populate: STRAPI_COURSE_POPULATE_OBJ,
      filters: {
        slug: {
          $eq: courseId,
        },
      },
    },
    {
      encodeValuesOnly: true,
    }
  )

  // Post query
  const postQuery = qs.stringify(
    {
      ...STRAPI_POST_QUERY_OBJ,
      filters: {
        slug: {
          $eq: postId,
        },
      },
    },
    {
      encodeValuesOnly: true,
    }
  )

  const [courseResp, postResp] = await Promise.all([
    axios.get(`${strapiUrl}/api/courses?${courseQuery}`, {
      headers: {
        Authorization: `Bearer ${strapiAPIKey}`,
      },
    }),
    axios.get(`${strapiUrl}/api/posts?${postQuery}`, {
      headers: {
        Authorization: `Bearer ${strapiAPIKey}`,
      },
    }),
  ])

  if (!courseResp.data.data.length || !postResp.data.data.length) {
    return {
      notFound: true,
    }
  }

  const course = new Course(courseResp.data.data[0])
  const post = new Post(postResp.data.data[0])
  const { nextPost, previousPost } = getNextAndPreviousPosts(course, post)

  return {
    props: {
      courseStr: JSON.stringify(course),
      postStr: JSON.stringify({
        ...post,
        nextPost,
        previousPost,
      }),
    },
    // revalidate: 60, // Optional: Enable ISR
  }
}

function PostPage({ course, post, goToPost, marked, markAsComplete, markAsIncomplete }) {
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  useEffect(() => {
    logAnalyticsEvent('course_post_viewed', {
      courseSlug: course.slug,
      postSlug: post.slug,
    })
    getComments()
  }, [post.slug, course.slug])

  const getComments = async () => {
    setLoadingComments(true)
    try {
      console.log('in frontend', { post })
      const resp = await axios.get(`/api/youtube/comments?videoId=${post.embed.id}`)
      console.log({ resp })
      const comments = resp.data.comments
      setComments(comments)
    } catch (err) {
      console.log({
        err,
      })
    } finally {
      setLoadingComments(false)
    }
  }
  return (
    <>
      <header className="mb-6">
        <h1 className="text-4xl text-center">{post.title}</h1>
      </header>
      {post.hasAssignment && (
        <SubmissionWrapper
          user={auth.currentUser}
          submissionParams={{
            courseId: course.slug,
            postId: post.slug,
          }}
          submitModalTitle={'Submit Assignment'}
          submitButtonText={'Submit Assignment'}
          submissionDone={() => {
            console.log('submitted')
          }}
          submissionUrl={`assignments/${course.slug}/${auth.currentUser?.uid}/${post.slug}`}
        ></SubmissionWrapper>
      )}
      {post.type === 'video' && (
        <>
          <section className="embed-container mb-4">
            {post.embed?.isYouTube ? (
              <YoutubePlayer
                videoId={post.embed.id}
                title={post.title}
                timestamp={post.embed.ts}
                comments={comments}
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
        </>
      )}
      <section className="my-4 flex justify-end">
        <div className="flex-1">
          {post.previousPost && (
            <Button
              color="primary"
              onClick={() => {
                goToPost(post.previousPost)
              }}
            >
              Previous
            </Button>
          )}
        </div>
        <div className="flex gap-4">
          {marked[post.slug] ? (
            <Button color="green" onClick={markAsIncomplete}>
              Completed
            </Button>
          ) : (
            <button
              onClick={markAsComplete}
              className="py-2 dark:text-white px-4 rounded-md font-bold"
            >
              Mark as Complete
            </button>
          )}
          {post.nextPost && (
            <Button
              color="primary"
              onClick={() => {
                goToPost(post.nextPost)
              }}
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
      {post.type === 'video' && post.embed?.isYouTube ? (
        <>
          <div className="flex gap-4 items-center justify-end mb-8">
            <Button color="primary" href={`https://youtu.be/${post.embed.id}`}>
              Like
            </Button>

            <Button color="primary" href={`https://youtu.be/${post.embed.id}`}>
              Post Comment
            </Button>
          </div>
          <ul className="comments-container space-y-6">
            {loadingComments ? (
              <div className="flex w-full justify-center items-center">
                <Spinner />
              </div>
            ) : (
              comments.map((comment) => {
                return (
                  <YouTubeComment
                    key={comment.topLevelComment.id}
                    comment={comment}
                    videoLink={`https://youtu.be/${post.embed.id}`}
                  />
                )
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
                a: (props) => (
                  <a className="text-yellow-300" target={'_blank'} {...props}>
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
            <ResourcesLinks resources={post.resources} />
          </section>
        )}
      </section>
    </>
  )
}

PostPage.showAds = true

export default function PostPageWithLayout({ courseStr, postStr, comments }) {
  const post = JSON.parse(postStr)
  const course = JSON.parse(courseStr)
  return (
    <>
      <CoursePostLayout
        ChildComponent={PostPage}
        postStr={postStr}
        courseStr={courseStr}
        comments={comments}
        seo={{
          title: `${post.title} - ${course.name}`,
          description: post.description,
        }}
      ></CoursePostLayout>
      <div className="flex items-center justify-center pt-4">
        <NewsletterForm />
      </div>
    </>
  )
}
