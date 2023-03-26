import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../classes/Course.class'
import { useEffect, useCallback, useState } from 'react'
import LegitMarkdown from '../../components/LegitMarkdown'
import Image from 'next/image'
import STRAPI_CONFIG from '../../lib/strapiConfig'
import ResourcesLinks from '../../components/ResourcesLinks'
import logAnalyticsEvent from '../../lib/utils/logAnalyticsEvent'
import Link from 'next/link'
import { getEnrollmentDoc } from '../../services/EnrollmentService'
import { getAuth } from 'firebase/auth'
import { getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { query, collection, getCountFromServer, where } from 'firebase/firestore'
import { CoursesList } from '../../components/courses/CoursesList'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

const auth = getAuth(getApp())
const db = getFirestore(getApp())

export async function getStaticPaths() {
  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar'],
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
  const config = {
    paths: courses.map((course) => ({
      params: {
        course: course.slug,
      },
    })),
    fallback: false,
  }
  return config
}

export async function getStaticProps({ params }) {
  const courseId = params.course

  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar', 'chapters', 'chapters.posts', 'banner', 'resources'],
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
  const course = new Course(coursesResp.data.data)
  return { props: { courseStr: JSON.stringify(course) } }
}

export default function CoursePage({ courseStr }) {
  const course = JSON.parse(courseStr)
  const [marked, setMarked] = useState({})
  const [enrollmentCount, setEnrollmentCount] = useState(null)

  const getMarked = useCallback(
    async (user) => {
      if (!user) {
        return
      }
      const enrollment = await getEnrollmentDoc({ course, attendee: user })
      setMarked(enrollment.data().marked)
    },
    [course]
  )

  const getGetEnrollmentCount = useCallback(async () => {
    const q = query(collection(db, 'enrollment'), where('courseId', '==', course.slug))
    const snapshot = await getCountFromServer(q)
    setEnrollmentCount(snapshot.data().count)
  }, [course.slug])

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
      <header className="text-5xl text-center mb-6 font-bold">
        <h1>{course.name}</h1>
        <p className="text-center text-xl">{enrollmentCount} students enrolled</p>
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
        <div className="my-4">
          {course.introEmbeddedUrl && (
            <section className="embed-container mb-4">
              <iframe
                src={course.introEmbeddedUrl}
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
      {course?.chapters && <CoursesList course={course} markedPosts={marked} />}
      {course.resources?.length ? (
        <div className="resources mt-6">
          <ResourcesLinks
            headingClasses="text-center mb-6 font-bold"
            resources={course.resources}
          />
        </div>
      ) : null}
      <div>
        <h4 className="my-6 text-center font-bold">Project Submissions</h4>
        <Link passHref href={`/courses/${course.slug}/submissions`}>
          <li
            className={`flex items-center gap-4 justify-between px-4 py-2 dark:bg-gray-700 dark:text-white dark:hover:bg-primary-800 cursor-pointer bg-gray-100 rounded-md hover:bg-primary-500 hover:text-white`}
          >
            <a className="break-words">View Submissions</a>
          </li>
        </Link>
      </div>
    </>
  )
}

CoursePage.showAds = true
