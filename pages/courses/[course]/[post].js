import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../../classes/Course.class'
import Post from '../../../classes/Post.class'
import PostsList from '../../../components/courses/PostsList'
import { useReducer, useEffect } from 'react'
import { postsReducer } from '../../../services/PostService'
import STRAPI_CONFIG from '../../../lib/strapiConfig'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

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
      populate: ['authors', 'authors.avatar', 'chapters', 'chapters.posts'],
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
  const postResp = await axios.get(`${strapiUrl}/api/posts/${postId}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Authorization: `Bearer ${strapiAPIKey}`,
    },
  })
  const course = new Course(coursesResp.data.data)
  const post = new Post(postResp.data.data)
  return { props: { courseStr: JSON.stringify(course), postStr: JSON.stringify(post) } }
}

export default function PostPage({ courseStr, postStr }) {
  const course = JSON.parse(courseStr)
  const [state, dispatch] = useReducer(postsReducer, { completedPosts: {} })
  const post = JSON.parse(postStr)
  const markAsComplete = () => {
    dispatch({
      type: 'MARK_AS_COMPLETE',
      payload: {
        slug: post.slug,
      },
    })
  }
  const markAsIncomplete = () => {
    dispatch({
      type: 'MARK_AS_INCOMPLETE',
      payload: {
        slug: post.slug,
      },
    })
  }

  useEffect(() => {
    dispatch({
      type: 'RETRIEVE_COMPLETED_POSTS',
    })
  }, [post.slug])
  return (
    <>
      <PageSEO title={post.title} description={post.description || siteMetadata.description} />
      <div className="flex flex-col-reverse md:grid md:grid-cols-3 gap-4">
        <article className="chapters col-span-1">
          {course &&
            course.chapters.map((chapter, index) => {
              return (
                <section key={index} className="mb-2">
                  {chapter.showName && (
                    <div className="mb-4 text-base font-bold">{chapter.name}</div>
                  )}
                  <PostsList
                    chapter={chapter}
                    courseSlug={course.slug}
                    post={post}
                    completedPosts={state.completedPosts}
                  />
                </section>
              )
            })}
        </article>
        <main className="flex-1 md:min-h-[300px] col-span-2">
          <div className="embed-container mb-4">
            <iframe src={post.embedUrl} title={post.title} frameBorder="0" allowFullScreen></iframe>
          </div>
          <div className="mb-4 flex justify-end">
            {state.completedPosts[post.slug] ? (
              <button
                onClick={markAsIncomplete}
                className="py-2 w-40 ring-1 dark:text-black dark:ring-offset-black dark:hover:ring-offset-2 ring-green-600 bg-green-500 text-white px-4 rounded-md font-medium  focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-green-500 hover:text-white "
              >
                Completed
              </button>
            ) : (
              <button
                onClick={markAsComplete}
                className="py-2 w-40 ring-1 dark:text-black dark:ring-gray-300  dark:bg-white dark:hover:bg-white dark:ring-offset-black dark:hover:ring-offset-2 ring-black bg-white px-4 rounded-md font-medium  focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-primary-700 hover:text-white "
              >
                Complete
              </button>
            )}
          </div>
        </main>
      </div>
    </>
  )
}

PostPage.showAds = true
