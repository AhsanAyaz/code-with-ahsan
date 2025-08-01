import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../classes/Course.class'
import { useEffect, useCallback, useState, useContext } from 'react'
import LegitMarkdown from '../../components/LegitMarkdown'
import Image from 'next/image'
import ResourcesLinks from '../../components/ResourcesLinks'
import logAnalyticsEvent from '../../lib/utils/logAnalyticsEvent'
import Link from 'next/link'
import { getEnrollmentDoc, unEnroll } from '../../services/EnrollmentService'
import { getAuth } from 'firebase/auth'
import { getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { query, collection, getCountFromServer, where } from 'firebase/firestore'
import { CoursesList } from '../../components/courses/CoursesList'
import Button from '@/components/Button'
import { getCurrentUser } from 'services/AuthService'
import { useRouter } from 'next/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPersonCirclePlus } from '@fortawesome/free-solid-svg-icons'
import { AuthContext } from '../../contexts/AuthContext'
import NewsletterForm from '../../components/NewsletterForm'
import { STRAPI_COURSE_POPULATE_OBJ } from '../../lib/strapiQueryHelpers'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

const auth = getAuth(getApp())
const db = getFirestore(getApp())

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
  return {
    paths: courses.map((course) => ({
      params: {
        course: course.slug,
      },
    })),
    fallback: false,
  }
}

export async function getStaticProps({ params }) {
  const courseId = params.course
  const query = qs.stringify(
    {
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

  const url = `${strapiUrl}/api/courses?${query}`
  const coursesResp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${strapiAPIKey}`,
    },
  })

  // Make sure to handle the case when no course is found
  if (!coursesResp.data.data.length) {
    return {
      notFound: true, // This will show 404 page
    }
  }

  const course = new Course(coursesResp.data.data[0])
  course.chapters.sort((a, b) => a.order - b.order)
  return {
    props: {
      courseStr: JSON.stringify(course),
    },
    // revalidate: 60, // Optional: Enable ISR
  }
}

export default function CoursePage({ courseStr }) {
  const course = JSON.parse(courseStr)
  const [marked, setMarked] = useState({})
  const [enrollmentCount, setEnrollmentCount] = useState(null)
  const [enrolled, setEnrolled] = useState(null)
  const router = useRouter()
  const { setShowLoginPopup } = useContext(AuthContext)
  const getMarked = useCallback(
    async (user) => {
      if (!user) {
        return
      }
      const enrollment = await getEnrollmentDoc({ course, attendee: user })
      const isEnrolled = enrollment.exists()
      setEnrolled(!!isEnrolled)
      if (!isEnrolled) {
        return
      }
      setMarked(enrollment.data().marked)
    },
    [course]
  )

  const getGetEnrollmentCount = useCallback(async () => {
    const q = query(collection(db, 'enrollment'), where('courseId', '==', course.slug))
    const snapshot = await getCountFromServer(q)
    setEnrollmentCount(snapshot.data().count)
  }, [course.slug])

  const enrollUser = async (event) => {
    event?.stopPropagation()
    await enroll(course)
  }

  useEffect(() => {
    const sub = auth.onAuthStateChanged((user) => {
      if (user) {
        getMarked(user)
      } else {
        setMarked({})
        setEnrolled(false)
      }
    })
    return () => {
      sub()
    }
  }, [])

  const enroll = async (course) => {
    const attendee = await getCurrentUser()
    if (!attendee) {
      setShowLoginPopup(true)
      return
    }
    await getEnrollmentDoc({ course, attendee }, true)
    router.push(`/courses/${course.slug}`)
    setEnrolled(true)
    logAnalyticsEvent('course_joined', {
      courseSlug: course.slug,
    })
  }

  useEffect(() => {
    logAnalyticsEvent('course_viewed', {
      courseSlug: course.slug,
    })
    getGetEnrollmentCount()
  }, [course.slug, getGetEnrollmentCount])

  return (
    <>
      <PageSEO
        title={course.name}
        imageUrl={course.banner}
        description={course.description || siteMetadata.description}
      />
      <header className="text-center mb-6 font-bold">
        <h1 className="text-5xl">{course.name}</h1>
        <p className="text-center text-xl mb-4">
          {enrollmentCount} student{enrollmentCount > 1 ? 's' : ''} enrolled
        </p>
        <dl className="flex flex-col my-4 gap-4 items-center">
          {/* <div className="flex items-center gap-4">
            <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Published</dt>
            <dd className="text-xs text-gray-500 dark:text-gray-300">
              {format(new Date(course.publishedAt), 'dd/MM/yyyy')}
            </dd>
          </div> */}

          {course.duration && (
            <div className="flex items-center gap-4">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Course Duration
              </dt>
              <dd className="text-xs text-gray-500 dark:text-gray-300">{course.duration}</dd>
            </div>
          )}
        </dl>
        <div className="my-4 post-cover-image banner-img">
          {course.introEmbeddedUrl && (
            <section className="embed-container mb-4">
              <iframe
                src={`${course.introEmbeddedUrl}`}
                title={course.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </section>
          )}
          {!course.introEmbeddedUrl && course.banner && (
            <Image
              width={900}
              height={400}
              objectFit={'contain'}
              alt={`${course.name} banner`}
              src={course.banner}
            />
          )}
        </div>
      </header>
      <div className="mb-6">
        <LegitMarkdown>{course.description}</LegitMarkdown>
      </div>
      <div className="mb-6">
        <LegitMarkdown>{course.outline}</LegitMarkdown>
      </div>
      {course?.chapters && (
        <CoursesList
          enrolled={enrolled}
          course={course}
          markedPosts={marked}
          enrollUser={enrollUser}
        />
      )}
      {course.resources?.length ? (
        <div className="resources mt-6">
          <ResourcesLinks
            headingClasses="text-center mb-6 font-bold"
            resources={course.resources}
          />
        </div>
      ) : null}
      {enrolled && (
        <section>
          <h4 className="my-6 text-center font-bold">Project Submissions</h4>
          <Link passHref href={`/courses/${course.slug}/submissions`}>
            <li
              className={`flex items-center gap-4 justify-between px-4 py-2 backdrop-blur border border-primary-500/20 dark:border-primary-500/30 hover:border-primary-500/40 dark:hover:border-primary-500/50 transition-colors rounded-lg shadow-lg cursor-pointer ${
                course.active
                  ? 'bg-primary-500 dark:bg-primary-800 text-white'
                  : 'bg-gray-200 dark:bg-gray-800/50'
              }`}
            >
              <a className="break-words text-gray-800 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-300">
                View Submissions
              </a>
            </li>
          </Link>
        </section>
      )}
      <section className="enrollment my-4" id="enrollmentManagement">
        {enrolled ? (
          <button
            onClick={async () => {
              const attendee = await getCurrentUser()
              const sure = confirm(
                `Are you sure you want to leave the course? This will delete all your progress in the course including any submitted assignments. Also, we hate to see you go :(`
              )
              if (sure) {
                await unEnroll({ course, attendee })
                setMarked({})
                logAnalyticsEvent('course_left', {
                  courseSlug: course.slug,
                })
                setEnrolled(false)
              }
            }}
            className="px-4 text-white uppercase hover:bg-red-500 hover:shadow-md rounded-md py-2 w-full bg-red-400 dark:bg-red-500 dark:hover:bg-red-600"
          >
            Leave Course
          </button>
        ) : (
          <Button
            onClick={enrollUser}
            color="primary"
            className="px-4 uppercase mb-0 py-3 w-full border-none rounded-none"
          >
            Enroll
          </Button>
        )}
      </section>
      {!enrolled ? (
        <Button
          onClick={enrollUser}
          color="primary"
          className="slide-in-left fixed bottom-20 right-4 shadow-lg text-center uppercase mb-52 py-1   border-none rounded-md"
        >
          <span className="mr-2">Enroll</span>{' '}
          <FontAwesomeIcon className="animate-bounce" icon={faPersonCirclePlus} />
        </Button>
      ) : null}
      <div className="flex items-center justify-center pt-4">
        <NewsletterForm />
      </div>
    </>
  )
}

CoursePage.showAds = true
