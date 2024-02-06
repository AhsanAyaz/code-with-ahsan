import axios from 'axios'
import qs from 'qs'
import Course from '../../../classes/Course.class'
import Post from '../../../classes/Post.class'
import { useEffect } from 'react'
import { getNextAndPreviousPosts } from '../../../services/PostService'
import STRAPI_CONFIG from '../../../lib/strapiConfig'
import Button from '../../../components/Button'
import logAnalyticsEvent from '../../../lib/utils/logAnalyticsEvent'
import ResourcesLinks from '../../../components/ResourcesLinks'
import LegitMarkdown from '../../../components/LegitMarkdown'
import CoursePostLayout from '../../../layouts/CoursePostLayout'
import SubmissionWrapper from '../../../components/SubmissionWrapper'
import { getAuth } from 'firebase/auth'
import { getApp } from 'firebase/app'
import NewsletterForm from '../../../components/NewsletterForm'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

const auth = getAuth(getApp())

export async function getStaticPaths() {
  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar', 'chapters', 'chapters.posts'],
      publicationState: STRAPI_CONFIG.publicationState,
    },
    {
      encodeValuesOnly: true,
    }
  )
  const url = `${strapiUrl}/api/courses?${query}`
  const coursesResp = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Authorization: `Bearer ${strapiAPIKey}`,
    },
  })
  const courses = coursesResp.data.data.map((course) => new Course(course))
  const paths = []
  courses.map((course) => {
    course.chapters.map((chapter) => {
      chapter.posts.map((post) => {
        paths.push({
          params: {
            course: course.slug,
            post: post.slug,
          },
        })
      })
    })
  })
  const config = {
    paths,
    fallback: false,
  }
  return config
}

export async function getStaticProps({ params }) {
  const { course: courseId, post: postId } = params

  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar', 'chapters', 'chapters.posts', 'resources', 'banner'],
      publicationState: STRAPI_CONFIG.publicationState,
    },
    {
      encodeValuesOnly: true,
    }
  )
  const url = `${strapiUrl}/api/courses/${courseId}?${query}`
  const coursesResp = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Authorization: `Bearer ${strapiAPIKey}`,
    },
  })
  const postQuery = qs.stringify(
    {
      populate: ['chapter', 'resources', 'article'],
      publicationState: STRAPI_CONFIG.publicationState,
    },
    {
      encodeValuesOnly: true,
    }
  )
  const postResp = await axios.get(`${strapiUrl}/api/posts/${postId}?${postQuery}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Authorization: `Bearer ${strapiAPIKey}`,
    },
  })
  const course = new Course(coursesResp.data.data)
  const post = new Post(postResp.data.data)
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
  }
}

function PostPage({ course, post, goToPost, marked, markAsComplete, markAsIncomplete, user }) {
  useEffect(() => {
    logAnalyticsEvent('course_post_viewed', {
      courseSlug: course.slug,
      postSlug: post.slug,
    })
    console.log(post)
  }, [post.slug, course.slug])
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
        <section className="embed-container mb-4">
          <iframe
            src={post.embedUrl}
            title={post.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </section>
      )}
      <section>
        {post.description && (
          <section className="mt-8 mb-4">
            <p>{post.description}</p>
          </section>
        )}
      </section>
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

export default function PostPageWithLayout({ courseStr, postStr }) {
  const post = JSON.parse(postStr)
  const course = JSON.parse(courseStr)
  return (
    <>
      <CoursePostLayout
        ChildComponent={PostPage}
        postStr={postStr}
        courseStr={courseStr}
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
