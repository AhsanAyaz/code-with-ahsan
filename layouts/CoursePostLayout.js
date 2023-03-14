import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { onSnapshot, updateDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getApp } from 'firebase/app'
import logAnalyticsEvent from '../lib/utils/logAnalyticsEvent'
import { getEnrollmentDoc, unEnroll } from '../services/EnrollmentService'
import { checkUserAndLogin } from '../services/AuthService'
import PostsList from '../components/courses/PostsList'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'

const auth = getAuth(getApp())

export default function CoursePostLayout({ courseStr, postStr, seo, ChildComponent }) {
  const course = JSON.parse(courseStr)
  const [marked, setMarked] = useState({})
  const [chaptersExpansion, setChaptersExpansion] = useState({})
  const [user, setUser] = useState(null)
  const [enrolled, setEnrolled] = useState(false)
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
      const enrollment = await getEnrollmentDoc({ course, attendee: user })
      const isEnrolled = enrollment.exists()
      setEnrolled(isEnrolled)
      if (isEnrolled) {
        setMarked(enrollment.data().marked)
      }
    },
    [course]
  )

  const markAsComplete = async () => {
    const attendee = await checkUserAndLogin()
    if (!attendee) {
      return
    }
    const enrollmentDoc = await getEnrollmentDoc({ course, attendee }, true)
    await updateDoc(enrollmentDoc.ref, {
      marked: {
        ...marked,
        [post.slug]: true,
      },
    })
    setMarked({
      ...marked,
      [post.slug]: true,
    })
    if (!enrolled) {
      setEnrolled(true)
    }
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
    const enrollmentDoc = await getEnrollmentDoc({ course, attendee })
    await updateDoc(enrollmentDoc.ref, {
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
        setEnrolled(false)
      }
      setUser(user)
    })

    const chaptersExp = course.chapters.reduce((acc, chapter) => {
      const params = {
        ...acc,
        [chapter.id]: false,
      }
      const hasActivePost = chapter.posts.find((chapterPost) => {
        return chapterPost.id === post.id
      })
      if (hasActivePost) {
        params[chapter.id] = true
      }
      return params
    }, {})
    setChaptersExpansion(chaptersExp)
    return () => {
      sub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.slug])

  useEffect(() => {
    if (!user) {
      return
    }

    let enrollmentSub
    getEnrollmentDoc({ course: course, attendee: user }).then((doc) => {
      enrollmentSub = onSnapshot(doc.ref, (snapshot) => {
        const exists = snapshot.exists()
        setEnrolled(exists)
      })
    })

    return () => {
      enrollmentSub()
    }
  }, [user, course.slug])

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
              const expanded = chaptersExpansion[chapter.id]
              return (
                <section
                  key={index}
                  className="mb-2 border-b border-b-gray-200 dark:border-b-gray-700"
                >
                  {chapter.showName && (
                    <button
                      onClick={() => {
                        setChaptersExpansion({
                          ...chaptersExpansion,
                          [chapter.id]: !chaptersExpansion[chapter.id],
                        })
                      }}
                      className="pb-4 w-full text-base font-bold flex items-center justify-between"
                    >
                      <span>
                        Chapter {index + 1} : {chapter.name}
                      </span>
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className={`${expanded ? 'rotate-180' : ''} duration-200`}
                      />
                    </button>
                  )}
                  {expanded ? (
                    <PostsList
                      chapter={chapter}
                      courseSlug={course.slug}
                      post={post}
                      completedPosts={marked}
                    />
                  ) : null}
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
          <div className="my-6">
            {enrolled ? (
              <button
                onClick={async () => {
                  const attendee = await checkUserAndLogin()
                  const sure = confirm(
                    `Are you sure you want to leave the course? This will delete all your progress in the course including any submitted assignments. Also, we hate to see you go :(`
                  )
                  if (sure) {
                    await unEnroll({ course, attendee })
                    setEnrolled(false)
                    setMarked({})
                  }
                }}
                className="px-4 text-white uppercase mb-6 hover:bg-red-500 hover:shadow-md rounded-md py-2 w-full bg-red-400 dark:bg-red-500 dark:hover:bg-red-600"
              >
                Leave Course
              </button>
            ) : (
              <button
                onClick={async () => {
                  const attendee = await checkUserAndLogin()
                  if (!attendee) {
                    return
                  }
                  await getEnrollmentDoc({ course, attendee }, true)
                  setEnrolled(true)
                }}
                className="px-4 text-white uppercase mb-6 hover:bg-yellow-500 hover:shadow-md rounded-md py-2 w-full bg-yellow-400 dark:bg-yellow-500 dark:hover:bg-yellow-600"
              >
                Enroll
              </button>
            )}
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
