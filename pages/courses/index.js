import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import CourseCard from '../../components/courses/CourseCard'
import qs from 'qs'
import Course from '../../classes/Course.class'
import { getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { useContext, useEffect, useState } from 'react'
import { getCurrentUser } from '../../services/AuthService'
import { getEnrollmentDoc } from '../../services/EnrollmentService'
import { useRouter } from 'next/router'
import { AuthContext } from 'contexts/AuthContext'

export async function getStaticProps() {
  const strapiUrl = process.env.STRAPI_URL
  const strapiAPIKey = process.env.STRAPI_API_KEY

  // Updated query structure for Strapi v5
  const query = qs.stringify(
    {
      populate: ['banner', 'authors', 'chapters'],
      sort: ['visibilityOrder:desc'],
      // publicationState is now handled differently in v5
      filters: {
        publishedAt: {
          $notNull: true,
        },
      },
    },
    {
      encodeValuesOnly: true,
    }
  )

  const url = `${strapiUrl}/api/courses?${query}`
  let courses = []

  try {
    // Updated headers for Strapi v5
    const coursesResp = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${strapiAPIKey}`,
      },
    })

    // Strapi v5 response structure might be slightly different
    const respData = coursesResp.data
    courses = respData.data.map((course) => new Course(course))
  } catch (err) {
    console.error('Error fetching courses:', err)
  }

  return {
    props: {
      coursesStr: JSON.stringify(courses),
    },
    // Add revalidate for ISR (Optional)
    // revalidate: 60, // Revalidate every 60 seconds
  }
}

const auth = getAuth(getApp())

export default function Courses({ coursesStr }) {
  const courses = JSON.parse(coursesStr)
  const router = useRouter()
  const [user, setUser] = useState(auth.currentUser)
  const { setShowLoginPopup } = useContext(AuthContext)

  useEffect(() => {
    const sub = auth.onAuthStateChanged((user) => {
      setUser(user)
    })
    return () => sub()
  }, [])

  const enroll = async (course) => {
    const attendee = await getCurrentUser()
    if (!attendee) {
      setShowLoginPopup(true)
      return
    }
    await getEnrollmentDoc({ course, attendee }, true)
    router.push(`/courses/${course.slug}`)
  }

  return (
    <>
      <PageSEO title={`Courses - ${siteMetadata.author}`} description={siteMetadata.description} />
      <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 text-center mt-4 mb-4 md:mb-8">
        Courses
      </h1>
      <div className="max-w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {courses?.map((course) => (
          <CourseCard course={course} user={user} enrollHandler={enroll} key={course.id} />
        ))}
      </div>
    </>
  )
}

Courses.showAds = true
