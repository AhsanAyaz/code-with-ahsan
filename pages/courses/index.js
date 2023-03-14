import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import CourseCard from '../../components/courses/CourseCard'
import qs from 'qs'
import Course from '../../classes/Course.class'
import STRAPI_CONFIG from '../../lib/strapiConfig'
import { getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { checkUserAndLogin } from '../../services/AuthService'
import { getEnrollmentDoc } from '../../services/EnrollmentService'

export async function getStaticProps() {
  const strapiUrl = process.env.STRAPI_URL
  const strapiAPIKey = process.env.STRAPI_API_KEY
  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar', 'banner', 'banner.image'],
      sort: ['publishedAt:desc'],
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
  return { props: { coursesStr: JSON.stringify(courses) } }
}

const auth = getAuth(getApp())

export default function Courses({ coursesStr }) {
  const courses = JSON.parse(coursesStr)
  const [user, setUser] = useState(auth.currentUser)
  useEffect(() => {
    const sub = auth.onAuthStateChanged((user) => {
      setUser(user)
    })

    return () => {
      sub()
    }
  }, [])

  const enroll = async (course) => {
    const attendee = await checkUserAndLogin()
    if (!attendee) {
      return
    }
    getEnrollmentDoc({ course, attendee }, true)
    window.location.href = `/courses/${course.slug}`
  }
  return (
    <>
      <PageSEO title={`Courses - ${siteMetadata.author}`} description={siteMetadata.description} />
      <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 text-center mt-4 mb-4 md:mb-8">
        Courses
      </h1>
      <div className="max-w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {courses &&
          courses.map((course) => {
            return <CourseCard course={course} user={user} enrollHandler={enroll} key={course.id} />
          })}
      </div>
    </>
  )
}

Courses.showAds = true
