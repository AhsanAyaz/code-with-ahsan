import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../../classes/Course.class'
import Post from '../../../classes/Post.class'
import PostsList from '../../../components/courses/PostsList'
import { useEffect, useState, useCallback } from 'react'
import { getNextAndPreviousPosts } from '../../../services/PostService'
import STRAPI_CONFIG from '../../../lib/strapiConfig'
import Link from 'next/link'
import Button from '../../../components/Button'
import { useRouter } from 'next/router'
import logAnalyticsEvent from '../../../lib/utils/logAnalyticsEvent'
import ResourcesLinks from '../../../components/ResourcesLinks'
import LegitMarkdown from '../../../components/LegitMarkdown'
import { getFirestore, getDoc, updateDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getApp } from 'firebase/app'
import { checkUserAndLogin, logIn } from '../../../services/AuthService'
import { getEnrollmentRef } from '../../../services/EnrollmentService'

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
      populate: ['chapter', 'resources', 'assignment'],
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

export default function PostPage({ courseStr, postStr }) {
  const course = JSON.parse(courseStr)
  const [marked, setMarked] = useState({})
  const post = JSON.parse(postStr)
  const router = useRouter()
  const goToPost = (slug) => {
    router.push(`/courses/${course.slug}/${slug}`)
  }

  useEffect(() => {
    const sub = auth.onAuthStateChanged((user) => {
      if (user) {
        getMarked(user)
      } else {
        setMarked({})
      }
    })

    return () => {
      sub()
    }
  }, [])

  const markAsComplete = async () => {
    const attendee = await checkUserAndLogin()
    if (!attendee) {
      return
    }
    const enrollmentRef = await getEnrollmentRef({ course, attendee })
    await updateDoc(enrollmentRef, {
      marked: {
        ...marked,
        [post.slug]: true,
      },
    })
    setMarked({
      ...marked,
      [post.slug]: true,
    })
    logAnalyticsEvent('post_marked_complete', {
      courseSlug: course.slug,
      postSlug: post.slug,
    })
  }
  const markAsIncomplete = async () => {
    const attendee = await checkUserAndLogin()
    if (!attendee) {
      return
    }
    const enrollmentRef = await getEnrollmentRef({ course, attendee })
    await updateDoc(enrollmentRef, {
      marked: {
        ...marked,
        [post.slug]: false,
      },
    })
    setMarked({
      ...marked,
      [post.slug]: false,
    })
    logAnalyticsEvent('post_marked_incomplete', {
      courseSlug: course.slug,
      postSlug: post.slug,
    })
  }

  const getMarked = useCallback(
    async (user) => {
      if (!user) {
        return
      }
      const enrollmentRef = await getEnrollmentRef({ course, attendee: user })
      const enrollment = await getDoc(enrollmentRef)
      setMarked(enrollment.data().marked)
    },
    [course]
  )

  useEffect(() => {
    logAnalyticsEvent('course_post_viewed', {
      courseSlug: course.slug,
      postSlug: post.slug,
    })
  }, [post.slug, course.slug])

  return (
    <>
      <PageSEO
        title={post.title}
        description={post.description || siteMetadata.description}
        imageUrl={post.videoEmbedded?.thumbnail || course.banner}
      />
      <div className="flex flex-col-reverse md:grid md:grid-cols-3 gap-4">
        <aside className="chapters col-span-1">
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
                    completedPosts={marked}
                  />
                </section>
              )
            })}
          {course.resources?.length ? (
            <div className="my-6">
              <h5 className="text-center md:text-left mb-4">Resources</h5>
              <Link passHref href={`/courses/${course.slug}/resources`}>
                <li
                  className={`flex items-center gap-4 justify-between px-4 py-2 dark:bg-gray-700 dark:text-white dark:hover:bg-[#6366f1] cursor-pointer bg-gray-100 rounded-md hover:bg-[#6366f1] hover:text-white`}
                >
                  <a className="break-words">View Resources</a>
                </li>
              </Link>
            </div>
          ) : null}
          <div className="my-6">
            <h5 className="text-center md:text-left mb-4">Project Submissions</h5>
            <Link passHref href={`/courses/${course.slug}/submissions`}>
              <li
                className={`flex items-center gap-4 justify-between px-4 py-2 dark:bg-gray-700 dark:text-white dark:hover:bg-[#6366f1] cursor-pointer bg-gray-100 rounded-md hover:bg-[#6366f1] hover:text-white`}
              >
                <a className="break-words">View Submissions</a>
              </li>
            </Link>
          </div>
        </aside>
        <main className="flex-1 md:min-h-[300px] col-span-2">
          <header className="mb-6">
            <h1 className="text-4xl text-center">{post.title}</h1>
          </header>
          <section className="embed-container mb-4">
            <iframe
              src={post.embedUrl}
              title={post.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </section>
          <section className="mb-4 flex justify-end">
            <div className="flex-1">
              {post.previousPost && (
                <Button
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
                  onClick={() => {
                    goToPost(post.nextPost)
                  }}
                >
                  Next
                </Button>
              )}
            </div>
          </section>
          {post.description && (
            <section className="mt-8 mb-4">
              <p>{post.description}</p>
            </section>
          )}
          {post.resources?.length > 0 && (
            <section className="mt-4">
              <ResourcesLinks resources={post.resources} />
            </section>
          )}
          {post.assignment && (
            <LegitMarkdown
              components={{
                a: (props) => (
                  <a className="text-yellow-300" target={'_blank'} {...props}>
                    {props.children}
                  </a>
                ),
              }}
            >
              {post.assignment}
            </LegitMarkdown>
          )}
        </main>
      </div>
    </>
  )
}

PostPage.showAds = true
