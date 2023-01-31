import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getDoc, updateDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getApp } from 'firebase/app'
import logAnalyticsEvent from '../lib/utils/logAnalyticsEvent'
import { getEnrollmentRef } from '../services/EnrollmentService'
import { checkUserAndLogin } from '../services/AuthService'
import PostsList from '../components/courses/PostsList'

const auth = getAuth(getApp())

export default function CoursePostLayout({ courseStr, postStr, seo, ChildComponent }) {
  const course = JSON.parse(courseStr)
  const [marked, setMarked] = useState({})
  const post = JSON.parse(postStr || '{}')
  const router = useRouter()
  const currentRoute = router.pathname
  const { title, description } = seo
  const goToPost = (slug) => {
    router.push(`/courses/${course.slug}/${slug}`)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.slug])

  return (
    <>
      <PageSEO
        title={title}
        description={description || siteMetadata.description}
        imageUrl={post?.videoEmbedded?.thumbnail || course.banner}
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
                  className={`flex items-center gap-4 justify-between px-4 py-2 dark:bg-gray-700 dark:text-white dark:hover:bg-[#6366f1] cursor-pointer bg-gray-100 rounded-md hover:bg-[#6366f1] hover:text-white ${
                    currentRoute === `/courses/[course]/resources`
                      ? 'bg-[#6366f1] dark:bg-[#6366f1] text-white'
                      : ''
                  } `}
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
                className={`flex items-center gap-4 justify-between px-4 py-2 dark:bg-gray-700 dark:text-white dark:hover:bg-[#6366f1] cursor-pointer bg-gray-100 rounded-md hover:bg-[#6366f1] hover:text-white ${
                  currentRoute === `/courses/[course]/submissions`
                    ? 'bg-[#6366f1] dark:bg-[#6366f1] text-white'
                    : ''
                } `}
              >
                <a className="break-words">View Submissions</a>
              </li>
            </Link>
          </div>
        </aside>
        <main className="flex-1 md:min-h-[300px] col-span-2">
          <ChildComponent
            post={post}
            course={course}
            goToPost={goToPost}
            marked={marked}
            markAsComplete={markAsComplete}
            markAsIncomplete={markAsIncomplete}
          ></ChildComponent>
        </main>
      </div>
    </>
  )
}
